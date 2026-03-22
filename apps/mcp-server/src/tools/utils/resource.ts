import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
} from "@modelcontextprotocol/ext-apps/server";
import type { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import type { ToolDeps } from "./types.js";

const __dirname =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));

export const connpassResourceUri = "ui://connpass/app.html";

function loadConnpassHtml(): string {
  try {
    // 本番ビルド: dist 配下に同梱された HTML を読む
    const htmlPath = join(__dirname, "mcp-app.html");
    return readFileSync(htmlPath, "utf-8");
  } catch {
    try {
      // 開発時: node_modules の connpass-ui ビルド成果物を参照する
      const htmlPath = join(
        __dirname,
        "..",
        "..",
        "node_modules",
        "@kajidog",
        "connpass-ui",
        "dist",
        "mcp-app.html",
      );
      return readFileSync(htmlPath, "utf-8");
    } catch {
      console.error(
        "Warning: connpass-ui HTML not found. Please build @kajidog/connpass-ui first.",
      );
      return "<html><body><p>Connpass UI not available. Please build @kajidog/connpass-ui.</p></body></html>";
    }
  }
}

const connpassHtml = loadConnpassHtml();

export function registerConnpassResource(deps: ToolDeps): void {
  const { server } = deps;
  registerAppResource(
    server,
    "Connpass App",
    connpassResourceUri,
    {
      description: "Interactive Connpass event browser",
      mimeType: RESOURCE_MIME_TYPE,
    },
    async (): Promise<ReadResourceResult> => ({
      contents: [
        {
          uri: connpassResourceUri,
          mimeType: RESOURCE_MIME_TYPE,
          text: connpassHtml,
          _meta: {
            ui: {
              csp: {
                resourceDomains: [
                  "https://connpass.com",
                  "https://media.connpass.com",
                ],
              },
            },
          },
        },
      ],
    }),
  );
}
