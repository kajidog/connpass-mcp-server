import { z } from "zod";
import { resolvePrefectureInputs } from "./prefectures.js";
import { summarizeGroupsResponse } from "./utils/formatting.js";
import { registerAppToolIfEnabled } from "./utils/registration.js";
import {
  GROUP_SORT_KEYS,
  GROUP_SORT_MAP,
  applyPagination,
} from "./utils/shared.js";
import type { ToolDeps } from "./utils/types.js";

const GroupSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Keywords matching group title or description")
    .optional(),
  groupIds: z
    .array(z.number())
    .describe("Limit to specific group IDs")
    .optional(),
  country: z.string().min(1).describe("ISO country code, e.g. 'JP'").optional(),
  prefecture: z
    .string()
    .min(1)
    .describe("Prefecture name to filter by")
    .optional(),
  page: z.number().int().min(1).describe("1-based page number").optional(),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Groups per page (default 20)")
    .optional(),
  sort: z
    .enum(GROUP_SORT_KEYS)
    .describe("Ranking by activity, members, or recency")
    .optional(),
});

type GroupSearchInput = z.infer<typeof GroupSearchInputSchema>;

function buildGroupSearchParams(input: GroupSearchInput) {
  const pagination = applyPagination(input.page, input.pageSize);
  const resolved = resolvePrefectureInputs(input.prefecture);
  if ("response" in resolved) {
    return resolved;
  }

  return {
    keyword: input.query,
    groupId: input.groupIds,
    countryCode: input.country,
    prefecture: resolved.prefectures?.[0] ?? input.prefecture,
    order: input.sort ? GROUP_SORT_MAP[input.sort] : undefined,
    ...pagination,
  };
}

export function registerGroupTools(deps: ToolDeps): void {
  const { server, connpassClient } = deps;

  registerAppToolIfEnabled(
    server,
    "search_groups",
    {
      title: "Search Groups",
      description: "Find Connpass groups with simple filters",
      inputSchema: GroupSearchInputSchema,
    },
    async (args: Record<string, unknown>) => {
      const params = GroupSearchInputSchema.parse(args ?? {});
      const searchParams = buildGroupSearchParams(params);
      if ("response" in searchParams) {
        return {
          ...searchParams.response,
          isError: true,
        };
      }
      const response = await connpassClient.searchGroups(searchParams);
      return {
        content: [
          { type: "text" as const, text: summarizeGroupsResponse(response) },
        ],
      };
    },
  );
}
