import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { getWidgetTemplateForTool } from "./widgets/index.js";

const TOOL_KIND_MAP = new Map<string, string>([
  ["search_events", "events"],
  ["get_event_presentations", "event_presentations"],
  ["get_my_upcoming_events", "events"],
  ["search_groups", "groups"],
  ["search_users", "users"],
  ["get_user_groups", "groups"],
  ["get_user_attended_events", "events"],
  ["get_user_presenter_events", "events"],
]);

export interface BuildCallToolResultOptions {
  toolName: string;
  result: unknown;
  includeAppsSdkPayload: boolean;
}

function toDisplayText(result: unknown): string {
  if (typeof result === "string") {
    return result;
  }

  if (result === undefined) {
    return "Tool returned no data.";
  }

  try {
    return JSON.stringify(result, null, 2);
  } catch (error) {
    return `Failed to serialize tool output: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function inferResultKind(toolName: string): string {
  return TOOL_KIND_MAP.get(toolName) ?? "generic";
}

function buildStructuredContent(toolName: string, result: unknown): Record<string, unknown> {
  return {
    app: "connpass",
    tool: toolName,
    kind: inferResultKind(toolName),
    generatedAt: new Date().toISOString(),
    data: result ?? null,
  } satisfies Record<string, unknown>;
}

export function buildCallToolResult(options: BuildCallToolResultOptions): CallToolResult {
  const { toolName, result, includeAppsSdkPayload } = options;
  const templateUri = includeAppsSdkPayload ? getWidgetTemplateForTool(toolName) : undefined;
  const contentItem: any = {
    type: "text",
    text: toDisplayText(result),
  };

  const base: CallToolResult = { content: [contentItem] };

  if (includeAppsSdkPayload) {
    console.log(
      `[apps-sdk] tool=${toolName} includeAppsSdkPayload=true template=${templateUri ?? "<missing>"}`
    );
    base.structuredContent = buildStructuredContent(toolName, result);
    if (templateUri) {
      // ★ 重要：content アイテム側にも _meta を付ける
      contentItem._meta = {
        ...(contentItem._meta ?? {}),
        "openai/outputTemplate": templateUri,
        "openai/resultCanProduceWidget": true,
        "openai/widgetAccessible": true,
        "openai/widgetCategory": "carousel",
      } as Record<string, unknown>;

      // 互換性のため、従来通り top-level にも残しておく（不要なら削除OK）
      base._meta = {
        ...(base._meta ?? {}),
        "openai/outputTemplate": templateUri,
        "openai/resultCanProduceWidget": true,
        "openai/widgetAccessible": true,
        "openai/widgetCategory": "carousel",
      } as Record<string, unknown>;

      console.log("[apps-sdk] widget meta", contentItem._meta);
    } else {
      console.warn(
        `[apps-sdk] tool=${toolName} has no widget template mapping; UI will not render.`
      );
    }
  }

  return base;
}
