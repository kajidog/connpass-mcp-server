#!/usr/bin/env node

import { ConnpassClient } from "@kajidog/connpass-api-client";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  type ReadResourceRequest,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { buildCallToolResult } from "./apps-sdk.js";
import { getOAuthConfig } from "./auth/index.js";
import {
  getRateLimitDelayMs,
  getRateLimitEnabled,
  isAppsSdkOutputEnabled,
} from "./config.js";
import { handleToolCall, tools } from "./tools/index.js";
import { startHttpServer } from "./transports/http.js";
import {
  getResourceContent,
  listResourceTemplates,
  listResources,
} from "./widgets/index.js";

const rateLimitEnabled = getRateLimitEnabled();
const rateLimitDelay = getRateLimitDelayMs();

const envApiKey = process.env.CONNPASS_API_KEY;
if (!envApiKey) {
  console.warn(
    "[mcp-server] CONNPASS_API_KEY not set. Using dummy-key (Connpass API will reject most requests)",
  );
} else {
  console.log(
    `[mcp-server] CONNPASS_API_KEY detected (length: ${envApiKey.length}).`,
  );
}

const connpassClient = new ConnpassClient({
  apiKey: envApiKey || "dummy-key",
  ...(rateLimitEnabled !== undefined ? { rateLimitEnabled } : {}),
  ...(rateLimitDelay !== undefined ? { rateLimitDelay } : {}),
});

function createConnpassServer() {
  const appsSdkOutputEnabled = isAppsSdkOutputEnabled();
  console.log(
    `[mcp-server] Apps SDK output ${appsSdkOutputEnabled ? "enabled" : "disabled"}.`,
  );
  const server = new Server(
    {
      name: "connpass-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        resourceTemplates: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = listResources();
    console.log("[mcp-server] list_resources", resources);
    return { resources };
  });

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    const templates = listResourceTemplates();
    console.log("[mcp-server] list_resource_templates", templates);
    return { resourceTemplates: templates };
  });

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const content = getResourceContent(request.params.uri);
      if (!content) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      const meta = Object.prototype.hasOwnProperty.call(content, "_meta")
        ? (content as Record<string, unknown>)._meta
        : undefined;
      console.log("[mcp-server] read_resource", request.params.uri, meta);

      return {
        contents: [content],
      };
    },
  );

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name, arguments: args } = request.params;
      const result = await handleToolCall(name, args, connpassClient);

      return buildCallToolResult({
        toolName: name,
        result,
        includeAppsSdkPayload: appsSdkOutputEnabled,
      });
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--port" || arg === "-p") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          port = parsed;
        }
        i++;
      }
    } else if (arg.startsWith("--port=")) {
      const parsed = Number.parseInt(arg.split("=")[1], 10);
      if (Number.isFinite(parsed)) {
        port = parsed;
      }
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Connpass MCP Server

Usage: connpass-mcp-server [options]

Options:
  -p, --port <number>     Port number (default: 3000)
  -h, --help             Show this help message

Examples:
  connpass-mcp-server                # Start on port 3000
  connpass-mcp-server -p 8080        # Start on port 8080

Environment Variables:
  CONNPASS_API_KEY                         Connpass API Key
  CONNPASS_DEFAULT_USER_ID                 Default user ID
  CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT   Include presentations by default
  CONNPASS_ENABLE_APPS_SDK_OUTPUT          Enable Apps SDK output
  MCP_OAUTH_ENABLED                        Enable OAuth (true/false)
  MCP_JWKS_URI                             JWKS URI for JWT verification
      `);
      process.exit(0);
    }
  }

  // Allow environment variable override for port
  const envPort = Number.parseInt(process.env.PORT ?? "", 10);
  if (Number.isFinite(envPort)) {
    port = envPort;
  }

  return { port };
}

async function main() {
  const { port } = parseArgs();

  await startHttpServer({
    createMcpServer: createConnpassServer,
    port,
    authConfig: getOAuthConfig(),
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
