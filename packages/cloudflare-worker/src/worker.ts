import { ConnpassClient } from "@kajidog/connpass-api-client";
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";
import { KVPresentationCache } from "./cache/kv-cache.js";

// Import from mcp-server package (we'll need to adjust imports)
// For now, we'll inline the necessary code or import from the package

interface Env {
  CONNPASS_CACHE: KVNamespace;
  CONNPASS_API_KEY?: string;
  CONNPASS_RATE_LIMIT_ENABLED?: string;
  CONNPASS_RATE_LIMIT_DELAY_MS?: string;
  CONNPASS_PRESENTATION_CACHE_ENABLED?: string;
  CONNPASS_PRESENTATION_CACHE_TTL_MS?: string;
  CONNPASS_ENABLE_APPS_SDK_OUTPUT?: string;
  CONNPASS_DEFAULT_USER_ID?: string;
  CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT?: string;
}

// Helper function to create ConnpassClient with KV cache
function createConnpassClient(env: Env): ConnpassClient {
  const rateLimitEnabled = env.CONNPASS_RATE_LIMIT_ENABLED?.toLowerCase() !== "false";
  const rateLimitDelay = env.CONNPASS_RATE_LIMIT_DELAY_MS ? Number(env.CONNPASS_RATE_LIMIT_DELAY_MS) : 1000;
  const cacheEnabled = env.CONNPASS_PRESENTATION_CACHE_ENABLED?.toLowerCase() !== "false";
  const cacheTtlMs = env.CONNPASS_PRESENTATION_CACHE_TTL_MS ? Number(env.CONNPASS_PRESENTATION_CACHE_TTL_MS) : 3600000;

  // Create KV-based cache
  const presentationCache = new KVPresentationCache({
    kv: env.CONNPASS_CACHE,
    enabled: cacheEnabled,
    ttlMs: cacheTtlMs,
  });

  return new ConnpassClient({
    apiKey: env.CONNPASS_API_KEY || "dummy-key",
    rateLimitEnabled,
    rateLimitDelay,
    presentationCache, // Use KV cache
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, mcp-session-id",
      "Access-Control-Expose-Headers": "mcp-session-id",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // Only allow POST for MCP
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      // Parse request
      const body = await request.json() as JSONRPCRequest;

      // Create MCP server instance
      // Note: We need to handle MCP protocol manually here since
      // StreamableHTTPServerTransport doesn't work in Workers

      // For now, we'll create a simple implementation
      // that handles the most common MCP methods

      const response = await handleMCPRequest(body, env);

      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error("Worker error:", error);

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Internal error",
          },
          id: null,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  },
};

// Handle MCP JSONRPC requests
async function handleMCPRequest(request: JSONRPCRequest, env: Env): Promise<any> {
  const { method, params, id } = request;

  // Forward Worker env variables to process.env so mcp-server config.ts can read them
  // This must happen before dynamic imports that depend on these environment variables
  if (env.CONNPASS_DEFAULT_USER_ID !== undefined) {
    process.env.CONNPASS_DEFAULT_USER_ID = env.CONNPASS_DEFAULT_USER_ID;
  }
  if (env.CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT !== undefined) {
    process.env.CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT = env.CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT;
  }
  if (env.CONNPASS_ENABLE_APPS_SDK_OUTPUT !== undefined) {
    process.env.CONNPASS_ENABLE_APPS_SDK_OUTPUT = env.CONNPASS_ENABLE_APPS_SDK_OUTPUT;
  }
  if (env.CONNPASS_RATE_LIMIT_ENABLED !== undefined) {
    process.env.CONNPASS_RATE_LIMIT_ENABLED = env.CONNPASS_RATE_LIMIT_ENABLED;
  }
  if (env.CONNPASS_RATE_LIMIT_DELAY_MS !== undefined) {
    process.env.CONNPASS_RATE_LIMIT_DELAY_MS = env.CONNPASS_RATE_LIMIT_DELAY_MS;
  }

  // Import tools from mcp-server source
  const { tools, handleToolCall } = await import("../../mcp-server/src/tools/index.js");

  // Use Workers-specific implementations (no filesystem access)
  const { buildCallToolResult } = await import("./apps-sdk.js");
  const { listResources, listResourceTemplates, getResourceContent } = await import("./widgets.js");

  const connpassClient = createConnpassClient(env);
  const appsSdkOutputEnabled = env.CONNPASS_ENABLE_APPS_SDK_OUTPUT?.toLowerCase() === "true";

  switch (method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            resourceTemplates: {},
          },
          serverInfo: {
            name: "connpass-mcp-server",
            version: "1.0.0",
          },
        },
      };
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools,
        },
      };
    }

    case "tools/call": {
      try {
        const { name, arguments: args } = params as any;
        const result = await handleToolCall(name, args, connpassClient);
        const toolResult = buildCallToolResult({
          toolName: name,
          result,
          includeAppsSdkPayload: appsSdkOutputEnabled,
        });

        return {
          jsonrpc: "2.0",
          id,
          result: toolResult,
        };
      } catch (error) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : "Tool call failed",
          },
        };
      }
    }

    case "resources/list": {
      const resources = listResources();
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources,
        },
      };
    }

    case "resources/templates/list": {
      const templates = listResourceTemplates();
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resourceTemplates: templates,
        },
      };
    }

    case "resources/read": {
      const { uri } = params as any;
      const content = getResourceContent(uri);

      if (!content) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Unknown resource: ${uri}`,
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [content],
        },
      };
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    }
  }
}
