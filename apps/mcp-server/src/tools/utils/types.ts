import type { ConnpassClient } from '@kajidog/connpass-api-client'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ServerConfig } from '../../config.js'

export interface ToolDeps {
  server: McpServer
  connpassClient: ConnpassClient
  config: ServerConfig
}
