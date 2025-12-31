import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  Resource,
  ResourceContents,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/types.js";

export const CONNPASS_EVENTS_WIDGET_URI =
  "ui://connpass/widgets/events-carousel.html";

function buildWidgetMeta() {
  return {
    "openai/outputTemplate": CONNPASS_EVENTS_WIDGET_URI,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
    "openai/widgetDomain": "connpass",
    "openai/widgetCSP": {
      connect_domains: ["https://connpass.com"],
      resource_domains: ["https://connpass.com", "https://media.connpass.com"],
      redirect_domains: ["https://connpass.com"],
    },
  } as const;
}

function loadHtmlDocument(): string {
  const candidates = [
    // React widget built by @connpass-mcp/widgets package
    resolve(__dirname, "../../../widgets/dist/connpass-events.html"),
    // Fallback: copied to dist during build
    resolve(__dirname, "connpass-events.html"),
    // Fallback: development source
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
    "Connpass widget HTML could not be located. Run 'pnpm build' in packages/widgets first.",
  );
}

const HTML_DOCUMENT = loadHtmlDocument();

export const connpassEventsWidget = {
  uri: CONNPASS_EVENTS_WIDGET_URI,
  resource: {
    uri: CONNPASS_EVENTS_WIDGET_URI,
    name: "Connpass events carousel",
    description:
      "Inline carousel widget with fullscreen detail view for Connpass events",
    mimeType: "text/html+sky",
    _meta: buildWidgetMeta(),
  } satisfies Resource,
  resourceTemplate: {
    uriTemplate: CONNPASS_EVENTS_WIDGET_URI,
    name: "Connpass events carousel",
    description:
      "Inline carousel widget with fullscreen detail view for Connpass events",
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
