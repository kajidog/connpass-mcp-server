import { ConnpassClient } from "@kajidog/connpass-api-client";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getConfig } from "./config.js";
import { registerAllTools } from "./tools/index.js";
import { SearchSessionStore } from "./tools/utils/searchSessionStore.js";
import type { ToolDeps } from "./tools/utils/types.js";

const config = getConfig();
let cachedServer: McpServer | null = null;

function createUnavailableConnpassClient(): ConnpassClient {
  const message =
    "CONNPASS_API_KEY is required to use Connpass API tools. Set the environment variable or pass --connpass-api-key.";

  return new Proxy({} as ConnpassClient, {
    get(_target, property) {
      if (property === "then") {
        return undefined;
      }

      if (typeof property === "symbol") {
        return undefined;
      }

      return async () => {
        throw new Error(message);
      };
    },
  });
}

function createConnpassClient(): ConnpassClient {
  if (!config.connpassApiKey?.trim()) {
    return createUnavailableConnpassClient();
  }

  return new ConnpassClient({
    apiKey: config.connpassApiKey,
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitDelay: config.rateLimitDelayMs,
  });
}

/**
 * McpServer を作成しツールを登録するファクトリ関数
 * HTTPモードではセッションごとに新しいインスタンスが必要
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "connpass-mcp-server",
    version: "0.3.0",
    description: "Connpass event search and browsing MCP server with Apps UI",
  });

  const connpassClient = createConnpassClient();
  const searchSessionStore = new SearchSessionStore();

  const deps: ToolDeps = {
    server,
    connpassClient,
    config,
    searchSessionStore,
  };

  registerAllTools(deps);

  return server;
}

export function getServer(): McpServer {
  if (!cachedServer) {
    cachedServer = createServer();
  }

  return cachedServer;
}

export const server = getServer();
export { config };
