import type {
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";

import {
  CONNPASS_EVENTS_WIDGET_URI,
  connpassEventsWidget,
} from "./connpass-events.js";

const widgets = [connpassEventsWidget];
const resources = widgets.map((widget) => widget.resource);
const resourceTemplates = widgets.map((widget) => widget.resourceTemplate);
const widgetContentMap = new Map<string, () => ResourceContents[number]>([
  [
    connpassEventsWidget.uri,
    connpassEventsWidget.content.bind(connpassEventsWidget),
  ],
]);

const TOOL_WIDGET_MAP = new Map<string, string>([
  ["search_events", CONNPASS_EVENTS_WIDGET_URI],
  ["get_my_upcoming_events", CONNPASS_EVENTS_WIDGET_URI],
]);

export function listResources(): Resource[] {
  return resources;
}

export function listResourceTemplates(): ResourceTemplate[] {
  return resourceTemplates;
}

export function getResourceContent(
  uri: string,
): ResourceContents[number] | undefined {
  const factory = widgetContentMap.get(uri);
  return factory?.();
}

export function getWidgetTemplateForTool(toolName: string): string | undefined {
  return TOOL_WIDGET_MAP.get(toolName);
}
