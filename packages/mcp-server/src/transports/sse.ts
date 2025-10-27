import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import { URL } from "node:url";

import type { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export type Logger = {
  info?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

type SessionRecord = {
  server: McpServer;
  transport: SSEServerTransport;
};

export type StartSseServerOptions = {
  createMcpServer: () => McpServer;
  port: number;
  ssePath?: string;
  messagePath?: string;
  logger?: Logger;
  enableCors?: boolean;
};

const defaultLogger: Required<Logger> = {
  info: (...args) => console.error(...args),
  error: (...args) => console.error(...args),
};

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
}

export async function startSseServer(options: StartSseServerOptions) {
  const {
    createMcpServer,
    port,
    ssePath = "/mcp",
    messagePath = "/mcp/messages",
    logger,
    enableCors = true,
  } = options;

  const log: Required<Logger> = {
    ...defaultLogger,
    ...(logger ?? {}),
  };

  const sessions = new Map<string, SessionRecord>();

  const handleSseRequest = async (res: ServerResponse) => {
    if (enableCors) {
      setCorsHeaders(res);
    }

    const server = createMcpServer();
    const transport = new SSEServerTransport(messagePath, res);
    const sessionId = transport.sessionId;

    sessions.set(sessionId, { server, transport });

    transport.onclose = async () => {
      sessions.delete(sessionId);
      try {
        // Prevent recursive close loops triggered by server.close() calling transport.close()
        transport.onclose = undefined;
        await server.close();
      } catch (error) {
        log.error("Failed to close MCP server:", error);
      }
    };

    transport.onerror = (error) => {
      log.error("SSE transport error:", error);
    };

    try {
      await server.connect(transport);
    } catch (error) {
      sessions.delete(sessionId);
      log.error("Failed to establish SSE connection:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Failed to establish SSE connection");
      }
    }
  };

  const handleMessagePost = async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ) => {
    if (enableCors) {
      setCorsHeaders(res);
    }

    const sessionId = url.searchParams.get("sessionId");

    if (!sessionId) {
      res.writeHead(400).end("Missing sessionId parameter");
      return;
    }

    const session = sessions.get(sessionId);

    if (!session) {
      res.writeHead(404).end("Unknown session");
      return;
    }

    try {
      await session.transport.handlePostMessage(req, res);
    } catch (error) {
      log.error("Failed to process message:", error);
      if (!res.headersSent) {
        res.writeHead(500).end("Failed to process message");
      }
    }
  };

  const httpServer = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Invalid request");
      return;
    }

    const origin = req.headers.host
      ? `http://${req.headers.host}`
      : "http://localhost";
    const url = new URL(req.url, origin);

    const normalizedPath = normalizePath(url.pathname);

    if (req.method === "GET" && normalizedPath === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          transport: "sse",
        }),
      );
      return;
    }

    if (
      req.method === "OPTIONS" &&
      (normalizedPath === ssePath || normalizedPath === messagePath)
    ) {
      if (enableCors) {
        setCorsHeaders(res);
      }
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && normalizedPath === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && normalizedPath === messagePath) {
      await handleMessagePost(req, res, url);
      return;
    }

    res.writeHead(404).end("Not found");
  });

  httpServer.on("clientError", (error, socket) => {
    log.error("HTTP client error:", error);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      log.info(
        `Connpass MCP Server listening on http://localhost:${port} (SSE transport)`,
      );
      log.info(`  SSE stream: GET http://localhost:${port}${ssePath}`);
      log.info(
        `  Message endpoint: POST http://localhost:${port}${messagePath}?sessionId=...`,
      );
      resolve();
    });
  });

  return {
    httpServer,
    close: async () => {
      await Promise.all(
        Array.from(sessions.values(), async ({ server, transport }) => {
          sessions.delete(transport.sessionId);
          await transport.close();
          await server.close();
        }),
      ).catch((error) => {
        log.error("Failed to shut down sessions:", error);
      });

      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    },
    ssePath,
    messagePath,
  } as const;
}

function normalizePath(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "") || "/";
}
