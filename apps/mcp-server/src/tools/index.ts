import { registerEventTools } from "./events.js";
import { registerGroupTools } from "./groups.js";
import { registerPrefectureTools } from "./prefectures.js";
import { registerScheduleTools } from "./schedule.js";
import { registerUITools } from "./ui-tools/index.js";
import { registerUserTools } from "./users.js";
import { registerConnpassResource } from "./utils/resource.js";
import type { ToolDeps } from "./utils/types.js";

export function registerAllTools(deps: ToolDeps): void {
  // UIリソース登録
  registerConnpassResource(deps);

  // 公開ツール登録
  registerEventTools(deps);
  registerScheduleTools(deps);
  registerGroupTools(deps);
  registerPrefectureTools(deps);
  registerUserTools(deps);

  // UI内部ツール登録
  registerUITools(deps);
}
