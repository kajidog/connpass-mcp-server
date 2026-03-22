import { registerAppTool } from '@modelcontextprotocol/ext-apps/server'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

/**
 * MCP Apps Extension 対応のツール登録ヘルパー
 */
export function registerAppToolIfEnabled(
  server: McpServer,
  name: string,
  ...args: [config: any, cb: any]
) {
  const [config, cb] = args
  const normalizedConfig =
    config && typeof config === 'object'
      ? {
          ...config,
          _meta:
            config._meta && typeof config._meta === 'object'
              ? config._meta
              : {},
        }
      : config

  registerAppTool(server, name, normalizedConfig, cb)
}
