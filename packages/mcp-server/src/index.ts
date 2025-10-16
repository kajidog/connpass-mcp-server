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
import {
  getMcpBasePath,
  getRateLimitDelayMs,
  getRateLimitEnabled,
  isAppsSdkOutputEnabled,
} from "./config.js";
import { handleToolCall, tools } from "./tools/index.js";
import { startHttpServer } from "./transports/http.js";
import { startSseServer } from "./transports/sse.js";
import {
  getResourceContent,
  listResourceTemplates,
  listResources,
} from "./widgets/index.js";

const rateLimitEnabled = getRateLimitEnabled();
const rateLimitDelay = getRateLimitDelayMs();

const connpassClient = new ConnpassClient({
  apiKey: process.env.CONNPASS_API_KEY || "dummy-key",
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
  let transport = "http"; // Default transport
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--transport" || arg === "-t") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        transport = value.toLowerCase();
        i++;
      }
    } else if (arg === "--port" || arg === "-p") {
      const value = args[i + 1];
      if (value && !value.startsWith("-")) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
          port = parsed;
        }
        i++;
      }
    } else if (arg.startsWith("--transport=")) {
      transport = arg.split("=")[1].toLowerCase();
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
  -t, --transport <type>  Transport type: http or sse (default: http)
  -p, --port <number>     Port number for http/sse transports (default: 3000)
  -h, --help             Show this help message

Examples:
  connpass-mcp-server                           # Start with HTTP transport on port 3000
  connpass-mcp-server --transport sse --port 8080  # Start with SSE transport on port 8080
  connpass-mcp-server -t http -p 5000          # Start with HTTP transport on port 5000

Environment Variables:
  CONNPASS_API_KEY                         Connpass API Key
  CONNPASS_DEFAULT_USER_ID                 Default user ID
  CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT   Include presentations by default
  CONNPASS_ENABLE_APPS_SDK_OUTPUT          Enable Apps SDK output
  MCP_BASE_PATH                            MCP base path (for SSE transport)
      `);
      process.exit(0);
    }
  }

  // Allow environment variable override for port
  const envPort = Number.parseInt(process.env.PORT ?? "", 10);
  if (Number.isFinite(envPort)) {
    port = envPort;
  }

  // Allow environment variable override for transport
  const envTransport = process.env.MCP_TRANSPORT?.toLowerCase();
  if (envTransport) {
    transport = envTransport;
  }

  return { transport, port };
}

async function main() {
  const { transport, port } = parseArgs();

  switch (transport) {
    case "http": {
      await startHttpServer({
        createMcpServer: createConnpassServer,
        port,
      });
      break;
    }

    case "sse": {
      const basePath = getMcpBasePath();
      const messagePath =
        basePath === "/" ? "/messages" : `${basePath}/messages`;

      await startSseServer({
        createMcpServer: createConnpassServer,
        ssePath: basePath,
        messagePath,
        port,
      });
      break;
    }

    default:
      throw new Error(
        `Unsupported MCP transport: ${transport}. Use 'http' or 'sse'.`,
      );
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
