import type {
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Lightweight widgets implementation for Cloudflare Workers
 * This module doesn't require filesystem access
 *
 * Note: Widget functionality is disabled in Workers by default.
 * If you need widget support, consider embedding the HTML as a string constant.
 */

// Return empty arrays since widgets aren't supported in Workers by default
export function listResources(): Resource[] {
  return [];
}

export function listResourceTemplates(): ResourceTemplate[] {
  return [];
}

export function getResourceContent(_uri: string): ResourceContents[number] | undefined {
  return undefined;
}

export function getWidgetTemplateForTool(_toolName: string): string | undefined {
  // Widget templates are not available in Workers
  return undefined;
}
