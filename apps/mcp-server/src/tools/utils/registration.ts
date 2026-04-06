import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type {
  McpUiAppToolConfig,
  ToolCallback,
  ToolConfig,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  AnySchema,
  ZodRawShapeCompat,
} from "@modelcontextprotocol/sdk/server/zod-compat.js";

let disabledToolNames: ReadonlySet<string> = new Set();

/**
 * 無効化するツール名のセットを設定する
 */
export function setDisabledTools(names: string[] | undefined): void {
  disabledToolNames = new Set(names ?? []);
}

/**
 * MCP Apps Extension 対応のツール登録ヘルパー
 */
export function registerAppToolIfEnabled(
  server: McpServer,
  name: string,
  ...args: [
    config: ToolConfig & {
      inputSchema?: undefined | ZodRawShapeCompat | AnySchema;
    },
    cb: ToolCallback<undefined | ZodRawShapeCompat | AnySchema>,
  ]
) {
  if (disabledToolNames.has(name)) return;

  const [config, cb] = args;
  const normalizedConfig = {
    ...config,
    _meta: config._meta && typeof config._meta === "object" ? config._meta : {},
  } as McpUiAppToolConfig & {
    inputSchema?: undefined | ZodRawShapeCompat | AnySchema;
  };

  registerAppTool(server, name, normalizedConfig, cb);
}
