import { ConnpassClient } from '@kajidog/connpass-api-client'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getConfig } from './config.js'
import { registerAllTools } from './tools/index.js'
import { SearchSessionStore } from './tools/utils/searchSessionStore.js'
import type { ToolDeps } from './tools/utils/types.js'

const config = getConfig()

/**
 * McpServer を作成しツールを登録するファクトリ関数
 * HTTPモードではセッションごとに新しいインスタンスが必要
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'connpass-mcp-server',
    version: '0.3.0',
    description: 'Connpass event search and browsing MCP server with Apps UI',
  })

  const connpassClient = new ConnpassClient({
    apiKey: config.connpassApiKey ?? '',
    rateLimitEnabled: config.rateLimitEnabled,
    rateLimitDelay: config.rateLimitDelayMs,
  })
  const searchSessionStore = new SearchSessionStore()

  const deps: ToolDeps = {
    server,
    connpassClient,
    config,
    searchSessionStore,
  }

  registerAllTools(deps)

  return server
}

export const server = createServer()
export { config }
