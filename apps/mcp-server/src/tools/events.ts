import { z } from "zod";
import { resolvePrefectureInputs } from "./prefectures.js";
import {
  FORMAT_PRESETS,
  type FormatEventOptions,
  formatEventsResponse,
  formatPresentationsResponse,
  summarizeEventsResponse,
} from "./utils/formatting.js";
import { registerAppToolIfEnabled } from "./utils/registration.js";
import { connpassResourceUri } from "./utils/resource.js";
import {
  EVENT_SORT_KEYS,
  EVENT_SORT_MAP,
  applyPagination,
  fetchEventDetail,
  normalizeKeywordOr,
  normalizeStringArray,
  parseHyphenatedDate,
  toYmdArray,
} from "./utils/shared.js";
import { type ToolDeps, paginationSchema } from "./utils/types.js";

const EventSearchInputSchema = z.object({
  anyQuery: z
    .string()
    .min(1)
    .describe("Search keywords (comma-separated, matches ANY keyword)")
    .optional(),
  on: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .describe("Specific date(s) in YYYY-MM-DD or YYYYMMDD format")
    .optional(),
  from: z
    .string()
    .min(1)
    .describe("Start of date range (inclusive). Format: YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .min(1)
    .describe("End of date range (inclusive). Format: YYYY-MM-DD")
    .optional(),
  participantNickname: z
    .string()
    .min(1)
    .describe("Filter by participant nickname")
    .optional(),
  hostNickname: z
    .string()
    .min(1)
    .describe("Filter by host/owner nickname")
    .optional(),
  groupIds: z
    .array(z.number())
    .describe("Limit results to specific group IDs")
    .optional(),
  prefectures: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .describe("Prefecture name(s) to filter by")
    .optional(),
  ...paginationSchema,
  sort: z.enum(EVENT_SORT_KEYS).describe("Sort order").optional(),
  includeDetails: z
    .boolean()
    .describe(
      "Include event description (up to 200 chars). Use when you need content details for recommendations.",
    )
    .default(false)
    .optional(),
});

type EventSearchInput = z.infer<typeof EventSearchInputSchema>;

const EventPresentationsInputSchema = z.object({
  eventId: z
    .union([z.number().int().positive(), z.string().min(1)])
    .describe("Connpass event ID")
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value), "eventId must be a number"),
});

function buildEventSearchParams(input: EventSearchInput) {
  const pagination = applyPagination(input.page, input.pageSize);
  const resolved = resolvePrefectureInputs(input.prefectures);
  if ("response" in resolved) {
    return resolved;
  }

  return {
    keywordOr: normalizeKeywordOr(input.anyQuery),
    ymd: toYmdArray(input.on),
    ymdFrom: input.from ? parseHyphenatedDate(input.from) : undefined,
    ymdTo: input.to ? parseHyphenatedDate(input.to) : undefined,
    nickname: input.participantNickname,
    ownerNickname: input.hostNickname,
    groupId: input.groupIds,
    prefecture: resolved.prefectures ?? normalizeStringArray(input.prefectures),
    order: input.sort ? EVENT_SORT_MAP[input.sort] : undefined,
    ...pagination,
  };
}

const LIST_FORMAT_OPTIONS: FormatEventOptions = {
  descriptionLimit: 0,
  catchPhraseLimit: 100,
};

export function registerEventTools(deps: ToolDeps): void {
  const { server, connpassClient, searchSessionStore } = deps;

  const searchEventsHandler = async (args: Record<string, unknown>) => {
    const params = EventSearchInputSchema.parse(args ?? {});
    const searchParams = buildEventSearchParams(params);
    if ("response" in searchParams) {
      return {
        ...searchParams.response,
        isError: true,
      };
    }
    const response = await connpassClient.searchEvents(searchParams);
    const formatOptions = params.includeDetails
      ? FORMAT_PRESETS.detailed
      : FORMAT_PRESETS.default;
    const formatted = formatEventsResponse(response, formatOptions);
    const browseFormatted = formatEventsResponse(response, LIST_FORMAT_OPTIONS);
    const searchSessionId = searchSessionStore.save(browseFormatted);
    return {
      content: [
        {
          type: "text" as const,
          text: summarizeEventsResponse(formatted, "events", {
            searchSessionId,
          }),
        },
      ],
      structuredContent: {
        kind: "events",
        searchSessionId,
        data: formatted,
      },
    };
  };

  // search_events - 公開ツール（UI なし、モデル向け）
  registerAppToolIfEnabled(
    server,
    "search_events",
    {
      title: "Search Events",
      description:
        "Search Connpass events and return results as text for reasoning and recommendations. Use this whenever the user asks about events.",
      inputSchema: EventSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    searchEventsHandler,
  );

  // browse_events - 公開ツール（UI あり、対話ブラウズ向け）
  registerAppToolIfEnabled(
    server,
    "browse_events",
    {
      title: "Browse Events",
      description:
        "Display previously searched events in the interactive event browser UI. Use this proactively when the user wants to browse event options, scan many candidates, compare events, or inspect results visually. The UI lets the user refine and re-run searches directly, so prefer this for event exploration. Call this ONCE with the searchSessionId returned by search_events. Do not use this to search again.",
      inputSchema: z.object({
        searchSessionId: z
          .uuid()
          .describe("Session ID returned by search_events"),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: {
        ui: { resourceUri: connpassResourceUri },
      },
    },
    async (args: Record<string, unknown>) => {
      const { searchSessionId } = z
        .object({
          searchSessionId: z.uuid(),
        })
        .parse(args ?? {});
      const formatted = searchSessionStore.get(searchSessionId);
      if (!formatted) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Search session not found or expired. Run search_events again, then call browse_events once with the returned searchSessionId.",
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Displayed ${formatted.events.length} of ${formatted.available} events in the browser UI.`,
          },
        ],
        structuredContent: {
          kind: "events",
          searchSessionId,
          data: formatted,
        },
      };
    },
  );

  // get_event_presentations - 公開ツール
  registerAppToolIfEnabled(
    server,
    "get_event_presentations",
    {
      title: "Get Event Presentations",
      description: "Look up presentation details for a specific event",
      inputSchema: EventPresentationsInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args: Record<string, unknown>) => {
      const { eventId } = EventPresentationsInputSchema.parse(args ?? {});
      const response = await connpassClient.getEventPresentations(eventId);
      const formatted = formatPresentationsResponse(response);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(formatted) }],
      };
    },
  );

  // get_event_detail - 公開ツール
  registerAppToolIfEnabled(
    server,
    "get_event_detail",
    {
      title: "Get Event Detail",
      description:
        "Get full details of a specific event by ID, including complete description and presentations",
      inputSchema: EventPresentationsInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args: Record<string, unknown>) => {
      const { eventId } = EventPresentationsInputSchema.parse(args ?? {});
      const { formatted, presentations } = await fetchEventDetail(
        connpassClient,
        eventId,
        FORMAT_PRESETS.full,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ event: formatted, presentations }),
          },
        ],
      };
    },
  );
}
