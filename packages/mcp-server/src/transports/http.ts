import { randomUUID } from "node:crypto";
import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import { URL } from "node:url";

import type { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

export type Logger = {
  info?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
};

type SessionRecord = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
};

export type StartHttpServerOptions = {
  createMcpServer: () => McpServer;
  port: number;
  logger?: Logger;
  enableCors?: boolean;
};

const defaultLogger: Required<Logger> = {
  info: (...args) => console.error(...args),
  error: (...args) => console.error(...args),
};

function setCorsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, mcp-session-id");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");
}

export async function startHttpServer(options: StartHttpServerOptions) {
  const { createMcpServer, port, logger, enableCors = true } = options;

  const log: Required<Logger> = {
    ...defaultLogger,
    ...(logger ?? {}),
  };

  const sessions = new Map<string, SessionRecord>();

  const httpServer = createServer(async (req, res) => {
    if (enableCors) {
      setCorsHeaders(res);
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const requestUrl = req.url
      ? new URL(req.url, `http://${req.headers.host ?? "localhost"}`)
      : undefined;
    const pathname = requestUrl?.pathname ?? "/";

    if (req.method === "GET" && pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          transport: "http",
        }),
      );
      return;
    }

    if (
      req.method !== "POST" &&
      req.method !== "GET" &&
      req.method !== "DELETE"
    ) {
      res.writeHead(405).end("Method Not Allowed");
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "GET") {
      // Handle GET requests for SSE streams
      if (pathname === "/healthz") {
        res.writeHead(405).end("Method Not Allowed");
        return;
      }

      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(400).end("Invalid or missing session ID");
        return;
      }

      const session = sessions.get(sessionId);
      if (session) {
        await session.transport.handleRequest(req, res);
      }
      return;
    }

    if (req.method === "DELETE") {
      // Handle DELETE requests for session termination
      if (!sessionId || !sessions.has(sessionId)) {
        res.writeHead(400).end("Invalid or missing session ID");
        return;
      }

      const session = sessions.get(sessionId);
      if (session) {
        await session.transport.handleRequest(req, res);
      }
      return;
    }

    // Handle POST requests
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          res.writeHead(400).end("Invalid JSON");
          return;
        }

        let session: SessionRecord | undefined;

        if (sessionId && sessions.has(sessionId)) {
          // Reuse existing session
          session = sessions.get(sessionId);
        } else if (!sessionId && isInitializeRequest(parsedBody)) {
          // New initialization request
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
              log.info(`Session initialized with ID: ${newSessionId}`);
              sessions.set(newSessionId, session!);
            },
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && sessions.has(sid)) {
              log.info(`Transport closed for session ${sid}`);
              sessions.delete(sid);
            }
          };

          transport.onerror = (error) => {
            log.error("HTTP transport error:", error);
          };

          const server = createMcpServer();
          session = { server, transport };

          await server.connect(transport);
          await transport.handleRequest(req, res, parsedBody);
          return;
        } else {
          // Invalid request
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Bad Request: No valid session ID provided",
              },
              id: null,
            }),
          );
          return;
        }

        // Handle request with existing transport
        if (session) {
          await session.transport.handleRequest(req, res, parsedBody);
        }
      } catch (error) {
        log.error("Failed to process request:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Failed to process request");
        }
      }
    });
  });

  httpServer.on("clientError", (error, socket) => {
    log.error("HTTP client error:", error);
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      log.info(
        `Connpass MCP Server listening on http://localhost:${port} (Streamable HTTP transport)`,
      );
      resolve();
    });
  });

  return {
    httpServer,
    close: async () => {
      await Promise.all(
        Array.from(sessions.values(), async ({ server, transport }) => {
          await transport.close();
          await server.close();
        }),
      ).catch((error: unknown) => {
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
  } as const;
}
