import type { Event } from "@kajidog/connpass-api-client";
import { z } from "zod";
import { resolvePrefectureInputs } from "../prefectures.js";
import { formatEvent, formatEventsResponse } from "../utils/formatting.js";
import { registerAppToolIfEnabled } from "../utils/registration.js";
import { connpassResourceUri } from "../utils/resource.js";
import {
  EVENT_SORT_MAP,
  applyPagination,
  normalizeKeywordOr,
  normalizeStringArray,
  parseHyphenatedDate,
  toYmdArray,
} from "../utils/shared.js";
import type { ToolDeps } from "../utils/types.js";

const UI_LIST_FORMAT_OPTIONS = {
  descriptionLimit: 0,
  catchPhraseLimit: 100,
} as const;

const UIEventSearchInputSchema = z.object({
  query: z.string().min(1).optional(),
  anyQuery: z.string().min(1).optional(),
  on: z.union([z.string().min(1), z.array(z.string().min(1))]).optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  participantNickname: z.string().min(1).optional(),
  hostNickname: z.string().min(1).optional(),
  groupIds: z.array(z.number()).optional(),
  prefectures: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .optional(),
  companyQuery: z.string().min(1).optional(),
  minAccepted: z.number().int().min(0).optional(),
  maxAccepted: z.number().int().min(0).optional(),
  minCapacity: z.number().int().min(0).optional(),
  maxCapacity: z.number().int().min(0).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sort: z
    .enum(["start-date-asc", "participant-count-desc", "title-asc"])
    .optional(),
});

function includesNormalized(
  targets: Array<string | undefined>,
  query?: string,
): boolean {
  if (!query) return true;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return targets.some((value) =>
    value?.toLowerCase().includes(normalizedQuery),
  );
}

function applyLocalFilters(
  events: Event[],
  params: z.infer<typeof UIEventSearchInputSchema>,
) {
  return events.filter((event) => {
    if (
      !includesNormalized(
        [event.ownerDisplayName, event.groupTitle],
        params.companyQuery,
      )
    ) {
      return false;
    }
    if (
      typeof params.minAccepted === "number" &&
      event.participantCount < params.minAccepted
    ) {
      return false;
    }
    if (
      typeof params.maxAccepted === "number" &&
      event.participantCount > params.maxAccepted
    ) {
      return false;
    }
    if (typeof params.minCapacity === "number") {
      const limit = typeof event.limit === "number" ? event.limit : 0;
      if (limit < params.minCapacity) return false;
    }
    if (typeof params.maxCapacity === "number") {
      const limit = typeof event.limit === "number" ? event.limit : 0;
      if (limit > params.maxCapacity) return false;
    }
    return true;
  });
}

function sortEvents(
  events: Event[],
  sort: z.infer<typeof UIEventSearchInputSchema>["sort"],
) {
  const copied = [...events];
  copied.sort((a, b) => {
    if (sort === "participant-count-desc") {
      return (
        b.participantCount - a.participantCount ||
        a.startedAt.localeCompare(b.startedAt)
      );
    }
    if (sort === "title-asc") {
      return (
        a.title.localeCompare(b.title, "ja") ||
        a.startedAt.localeCompare(b.startedAt)
      );
    }
    return a.startedAt.localeCompare(b.startedAt);
  });
  return copied;
}

export function registerUISearchTool(deps: ToolDeps): void {
  const { server, connpassClient } = deps;

  registerAppToolIfEnabled(
    server,
    "_search_events",
    {
      title: "Search Events (UI)",
      description: "Internal: re-search events from UI",
      inputSchema: UIEventSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: {
        ui: {
          resourceUri: connpassResourceUri,
          visibility: ["app"],
        },
      },
    },
    async (args: Record<string, unknown>) => {
      const params = UIEventSearchInputSchema.parse(args ?? {});
      const useLocalFiltering =
        Boolean(params.companyQuery) ||
        typeof params.minAccepted === "number" ||
        typeof params.maxAccepted === "number" ||
        typeof params.minCapacity === "number" ||
        typeof params.maxCapacity === "number" ||
        params.sort === "participant-count-desc" ||
        params.sort === "title-asc";

      const pagination = useLocalFiltering
        ? {}
        : applyPagination(params.page, params.pageSize);
      const resolved = resolvePrefectureInputs(params.prefectures);
      if ("response" in resolved) {
        return {
          ...resolved.response,
          isError: true,
        };
      }
      const searchParams = {
        keyword: params.query,
        keywordOr: normalizeKeywordOr(params.anyQuery),
        ymd: toYmdArray(params.on),
        ymdFrom: params.from ? parseHyphenatedDate(params.from) : undefined,
        ymdTo: params.to ? parseHyphenatedDate(params.to) : undefined,
        nickname: params.participantNickname,
        ownerNickname: params.hostNickname,
        groupId: params.groupIds,
        prefecture:
          resolved.prefectures ?? normalizeStringArray(params.prefectures),
        order: EVENT_SORT_MAP["start-date-asc"],
        ...pagination,
      };

      if (!useLocalFiltering) {
        const response = await connpassClient.searchEvents(searchParams);
        const formatted = formatEventsResponse(
          response,
          UI_LIST_FORMAT_OPTIONS,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
          structuredContent: {
            kind: "events",
            data: formatted,
          },
        };
      }

      const response = await connpassClient.getAllEvents(searchParams);
      const filtered = sortEvents(
        applyLocalFilters(response.events, params),
        params.sort,
      );
      const pageSize = params.pageSize ?? 20;
      const page = params.page ?? 1;
      const sliceStart = (page - 1) * pageSize;
      const paged = filtered.slice(sliceStart, sliceStart + pageSize);
      const formatted = {
        returned: paged.length,
        available: filtered.length,
        start: filtered.length === 0 ? 0 : sliceStart + 1,
        events: paged.map((event) =>
          formatEvent(event, UI_LIST_FORMAT_OPTIONS),
        ),
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
        structuredContent: {
          kind: "events",
          data: formatted,
        },
      };
    },
  );
}
