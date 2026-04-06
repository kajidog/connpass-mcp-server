import type { ConnpassClient } from "@kajidog/connpass-api-client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ServerConfig } from "../../config.js";
import type { SearchSessionStore } from "./searchSessionStore.js";

export interface ToolDeps {
  server: McpServer;
  connpassClient: ConnpassClient;
  config: ServerConfig;
  searchSessionStore: SearchSessionStore;
}

export const paginationSchema = {
  page: z.number().int().min(1).describe("1-based page number").optional(),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Results per page (default 20, max 100)")
    .optional(),
};
