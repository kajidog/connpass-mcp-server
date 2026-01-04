import { randomUUID } from "node:crypto";
import { serve } from "@hono/node-server";
import type { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  type OAuthConfig,
  bearerAuth,
  createProtectedResourceMetadata,
} from "../auth/index.js";

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
  authConfig?: OAuthConfig | null;
};

const defaultLogger: Required<Logger> = {
  info: (...args) => console.error(...args),
  error: (...args) => console.error(...args),
};

export async function startHttpServer(options: StartHttpServerOptions) {
  const {
    createMcpServer,
    port,
    logger,
    enableCors = true,
    authConfig,
  } = options;

  const log: Required<Logger> = {
    ...defaultLogger,
    ...(logger ?? {}),
  };

  const sessions = new Map<string, SessionRecord>();
  const app = new Hono();

  // CORS middleware
  if (enableCors) {
    app.use(
      "*",
      cors({
        origin: "*",
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "mcp-session-id", "Authorization"],
        exposeHeaders: ["mcp-session-id"],
      }),
    );
  }

  // Health check endpoint (no auth required)
  app.get("/healthz", (c) =>
    c.json({
      status: "ok",
      transport: "http",
    }),
  );

  // OAuth metadata endpoint (no auth required)
  if (authConfig) {
    app.get("/.well-known/oauth-protected-resource", (c) =>
      c.json(createProtectedResourceMetadata(authConfig)),
    );
  }

  // Create MCP routes group (with optional auth)
  const mcpApp = new Hono();

  // Apply auth middleware if enabled
  if (authConfig) {
    mcpApp.use("*", bearerAuth(authConfig));
  }

  // GET: SSE stream for existing session
  mcpApp.get("/", async (c) => {
    const sessionId = c.req.header("mcp-session-id");

    if (!sessionId || !sessions.has(sessionId)) {
      return c.text("Invalid or missing session ID", 400);
    }

    const session = sessions.get(sessionId);
    if (session) {
      // Convert Hono request/response to Node.js format
      const nodeReq = (c.env as { incoming: { req: unknown } })?.incoming?.req;
      const nodeRes = (c.env as { outgoing: { res: unknown } })?.outgoing?.res;
      if (nodeReq && nodeRes) {
        await session.transport.handleRequest(
          nodeReq as Parameters<typeof session.transport.handleRequest>[0],
          nodeRes as Parameters<typeof session.transport.handleRequest>[1],
        );
        return new Response(null, { status: 200 });
      }
    }
    return c.text("Internal error", 500);
  });

  // DELETE: Terminate session
  mcpApp.delete("/", async (c) => {
    const sessionId = c.req.header("mcp-session-id");

    if (!sessionId || !sessions.has(sessionId)) {
      return c.text("Invalid or missing session ID", 400);
    }

    const session = sessions.get(sessionId);
    if (session) {
      const nodeReq = (c.env as { incoming: { req: unknown } })?.incoming?.req;
      const nodeRes = (c.env as { outgoing: { res: unknown } })?.outgoing?.res;
      if (nodeReq && nodeRes) {
        await session.transport.handleRequest(
          nodeReq as Parameters<typeof session.transport.handleRequest>[0],
          nodeRes as Parameters<typeof session.transport.handleRequest>[1],
        );
        return new Response(null, { status: 200 });
      }
    }
    return c.text("Internal error", 500);
  });

  // POST: Handle MCP requests
  mcpApp.post("/", async (c) => {
    const nodeReq = (c.env as { incoming: { req: unknown } })?.incoming?.req;
    const nodeRes = (c.env as { outgoing: { res: unknown } })?.outgoing?.res;

    if (!nodeReq || !nodeRes) {
      return c.text(
        "Internal error: Node.js request/response not available",
        500,
      );
    }

    const sessionId = c.req.header("mcp-session-id");
    let parsedBody: unknown;

    try {
      parsedBody = await c.req.json();
    } catch {
      return c.text("Invalid JSON", 400);
    }

    let session: SessionRecord | undefined;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
    } else if (!sessionId && isInitializeRequest(parsedBody)) {
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
      await transport.handleRequest(
        nodeReq as Parameters<typeof transport.handleRequest>[0],
        nodeRes as Parameters<typeof transport.handleRequest>[1],
        parsedBody,
      );
      return new Response(null, { status: 200 });
    } else {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        },
        400,
      );
    }

    if (session) {
      await session.transport.handleRequest(
        nodeReq as Parameters<typeof session.transport.handleRequest>[0],
        nodeRes as Parameters<typeof session.transport.handleRequest>[1],
        parsedBody,
      );
      return new Response(null, { status: 200 });
    }

    return c.text("Internal error", 500);
  });

  // Mount MCP routes at root
  app.route("/", mcpApp);

  // Start server
  const httpServer = serve({
    fetch: app.fetch,
    port,
  });

  log.info(
    `Connpass MCP Server listening on http://localhost:${port} (Hono + Streamable HTTP transport)`,
  );
  if (authConfig) {
    log.info(
      `OAuth 2.0 authentication enabled. Resource: ${authConfig.resourceName}`,
    );
  }

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

      httpServer.close();
    },
  } as const;
}
