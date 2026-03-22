import type { ToolDeps } from "../utils/types.js";
import { registerUIEventDetailTool } from "./detail.js";
import { registerUIScheduleTool } from "./schedule.js";
import { registerUISearchTool } from "./search.js";

export function registerUITools(deps: ToolDeps): void {
  registerUIEventDetailTool(deps);
  registerUISearchTool(deps);
  registerUIScheduleTool(deps);
}
