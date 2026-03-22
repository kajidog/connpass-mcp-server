#!/usr/bin/env node
// Connpass MCP Apps Server エントリーポイント

import { isNodejs, launchServer } from "@kajidog/mcp-core";
import { getConfig, getHelpText } from "./config.js";
import { createServer, server } from "./server.js";

function isCLI(): boolean {
  if (!isNodejs() || !process.argv) return false;

  const isNpmStart = process.env?.npm_lifecycle_event === "start";
  const argv1 = process.argv[1] || "";
  const isDirectExecution =
    argv1.includes("connpass-mcp-apps") ||
    argv1.endsWith("dist/index.js") ||
    argv1.endsWith("src/index.ts") ||
    argv1.includes("index.js") ||
    argv1.includes("npx");

  const config = getConfig();
  const isForceMode = config.httpMode;

  const isMainModule =
    process.argv0?.includes("node") || process.argv0?.includes("bun");

  return isNpmStart || isDirectExecution || isForceMode || isMainModule;
}

function printHelp() {
  console.log(`\n${getHelpText()}`);
}

async function startMCPServer(): Promise<void> {
  if (!isNodejs()) {
    throw new Error("Node.js environment required");
  }

  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const shouldStart = isCLI();

  const config = getConfig();

  if (config.httpMode) {
    console.error("Server configuration:", {
      port: config.httpPort,
      host: config.httpHost,
      isDevelopment: process.env.NODE_ENV === "development",
      isHttpMode: config.httpMode,
    });
  }

  if (!shouldStart) {
    return;
  }

  await launchServer({
    server,
    config,
    serverName: "Connpass MCP Apps",
    serverFactory: createServer,
  });
}

if (isNodejs()) {
  startMCPServer().catch((error) => {
    console.error("Initialization error:", error);
  });
}
