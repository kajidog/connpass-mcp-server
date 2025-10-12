import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";

export const CONNPASS_EVENTS_WIDGET_URI = "ui://connpass/widgets/events-carousel.html";

function buildWidgetMeta() {
  return {
    "openai/outputTemplate": CONNPASS_EVENTS_WIDGET_URI,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

function loadHtmlDocument(): string {
  const candidates = [
    resolve(__dirname, "connpass-events.html"),
    resolve(__dirname, "../../src/widgets/connpass-events.html"),
  ];

  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
      // ignore and try next path
    }
  }

  throw new Error(
    "Connpass widget HTML could not be located. Ensure connpass-events.html is copied next to the compiled widgets or run the build step."
  );
}

const HTML_DOCUMENT = loadHtmlDocument();

export const connpassEventsWidget = {
  uri: CONNPASS_EVENTS_WIDGET_URI,
  resource: {
    uri: CONNPASS_EVENTS_WIDGET_URI,
    name: "Connpass events carousel",
    description: "Inline carousel widget with fullscreen detail view for Connpass events",
    mimeType: "text/html+sky",
    _meta: buildWidgetMeta(),
  } satisfies Resource,
  resourceTemplate: {
    uriTemplate: CONNPASS_EVENTS_WIDGET_URI,
    name: "Connpass events carousel",
    description: "Inline carousel widget with fullscreen detail view for Connpass events",
    mimeType: "text/html+sky",
    _meta: buildWidgetMeta(),
  } satisfies ResourceTemplate,
  content(): ResourceContents[number] {
    return {
      uri: CONNPASS_EVENTS_WIDGET_URI,
      mimeType: "text/html+sky",
      text: HTML_DOCUMENT,
      _meta: {
        ...buildWidgetMeta(),
        "openai/widgetCategory": "carousel",
      },
    };
  },
};
