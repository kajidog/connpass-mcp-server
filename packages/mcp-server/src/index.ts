#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { ConnpassClient } from "@kajidog/connpass-api-client";
import { startSseServer } from "./transports/sse.js";
import { tools, handleToolCall } from "./tools/index.js";
import { buildCallToolResult } from "./apps-sdk.js";
import { getMcpBasePath, isAppsSdkOutputEnabled } from "./config.js";
import {
  getResourceContent,
  listResourceTemplates,
  listResources,
} from "./widgets/index.js";

const connpassClient = new ConnpassClient({
  apiKey: process.env.CONNPASS_API_KEY || "dummy-key",
});

function createConnpassServer() {
  const appsSdkOutputEnabled = isAppsSdkOutputEnabled();
  console.log(
    `[mcp-server] Apps SDK output ${appsSdkOutputEnabled ? "enabled" : "disabled"}.`
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
    }
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

  server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
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
  });

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

async function main() {
  const transport = process.env.MCP_TRANSPORT?.toLowerCase() ?? "sse";

  if (transport !== "sse") {
    throw new Error(`Unsupported MCP transport: ${transport}`);
  }

  const requestedPort = Number.parseInt(process.env.PORT ?? "", 10);
  const port = Number.isFinite(requestedPort) ? requestedPort : 3000;
  const basePath = getMcpBasePath();
  const messagePath = basePath === "/" ? "/messages" : `${basePath}/messages`;

  await startSseServer({
    createMcpServer: createConnpassServer,
    ssePath: basePath,
    messagePath,
    port,
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
