import type { ToolDeps } from '../utils/types.js'
import { registerUIEventDetailTool } from './detail.js'
import { registerUISearchTool } from './search.js'
import { registerUIScheduleTool } from './schedule.js'

export function registerUITools(deps: ToolDeps): void {
  registerUIEventDetailTool(deps)
  registerUISearchTool(deps)
  registerUIScheduleTool(deps)
}
