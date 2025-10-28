import { ConnpassClient } from "@kajidog/connpass-api-client";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import type {
  Event,
  PresentationsResponse,
} from "@kajidog/connpass-api-client";
import {
  getDefaultIncludePresentations,
  getDefaultUserId,
  isAppsSdkOutputEnabled,
} from "../config.js";
import { CONNPASS_EVENTS_WIDGET_URI } from "../widgets/connpass-events.js";
import {
  FormatEventOptions,
  formatEventList,
  formatEventsResponse,
  formatPresentationsResponse,
} from "./formatting.js";
import {
  EVENT_SORT_KEYS,
  EVENT_SORT_MAP,
  applyPagination,
  normalizeStringArray,
  parseDateInput,
  parseHyphenatedDate,
  toYmdArray,
} from "./shared.js";

function buildEventsWidgetMeta() {
  return {
    "openai/outputTemplate": CONNPASS_EVENTS_WIDGET_URI,
    "openai/resultCanProduceWidget": true,
    "openai/widgetAccessible": true,
    "openai/widgetCategory": "carousel",
    "openai/toolInvocation/invoking": "Connpassイベントを検索中…",
    "openai/toolInvocation/invoked": "Connpassイベントを表示しました",
  } as const;
}

const EventSearchInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe("Search for events that match ALL of these keywords")
    .optional(),
  anyQuery: z
    .string()
    .min(1)
    .describe(
      "Search for events that match ANY of these keywords (comma separated is ok)",
    )
    .optional(),
  on: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .describe(
      "Specific date(s) to match. Format: YYYY-MM-DD or YYYYMMDD (e.g., '2024-12-24' or '20241224')",
    )
    .optional(),
  from: z
    .string()
    .min(1)
    .describe(
      "Start of the date range (inclusive). Format: YYYY-MM-DD or YYYYMMDD (e.g., '2024-12-01')",
    )
    .optional(),
  to: z
    .string()
    .min(1)
    .describe(
      "End of the date range (inclusive). Format: YYYY-MM-DD or YYYYMMDD. Use together with 'from' for a window",
    )
    .optional(),
  participantNickname: z
    .string()
    .min(1)
    .describe("Filter by participant nickname")
    .optional(),
  hostNickname: z
    .string()
    .min(1)
    .describe("Filter by host / owner nickname")
    .optional(),
  groupIds: z
    .array(z.number())
    .describe("Limit results to specific Connpass group IDs")
    .optional(),
  prefectures: z
    .union([z.string().min(1), z.array(z.string().min(1))])
    .describe("Prefecture name(s) to filter by")
    .optional(),
  page: z
    .number()
    .int()
    .min(1)
    .describe("1-based page number. Each page contains 'pageSize' items")
    .optional(),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("How many events per page (default 20, Connpass max 100)")
    .optional(),
  sort: z
    .enum(EVENT_SORT_KEYS)
    .describe("Sort order: soonest first, latest first, or newly added")
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

const MyUpcomingEventsInputSchema = z.object({
  userId: z
    .number()
    .int()
    .positive()
    .describe("Connpass user ID. If omitted, uses CONNPASS_DEFAULT_USER_ID")
    .optional(),
  nickname: z
    .string()
    .min(1)
    .describe(
      "Connpass user nickname. If specified, searches for the user by this nickname",
    )
    .optional(),
  daysAhead: z
    .number()
    .int()
    .min(1)
    .max(60)
    .describe("How many days ahead to include (default 7)")
    .optional(),
  maxEvents: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Maximum number of attended events to examine (default 30)")
    .optional(),
  includePresentations: z
    .boolean()
    .describe(
      "Whether to fetch presentation details for each event. Extra API calls respect the 1 req/sec limit",
    )
    .optional(),
});

function buildEventSearchParams(
  input: EventSearchInput,
  options?: { includePagination?: boolean },
) {
  const pagination = applyPagination(input.page, input.pageSize, options);

  return {
    keyword: input.query,
    keywordOr: input.anyQuery,
    ymd: toYmdArray(input.on),
    ymdFrom: input.from ? parseHyphenatedDate(input.from) : undefined,
    ymdTo: input.to ? parseHyphenatedDate(input.to) : undefined,
    nickname: input.participantNickname,
    ownerNickname: input.hostNickname,
    groupId: input.groupIds,
    prefecture: normalizeStringArray(input.prefectures),
    order: input.sort ? EVENT_SORT_MAP[input.sort] : undefined,
    ...pagination,
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type EventWithPresentations = Event & {
  presentations?: PresentationsResponse["presentations"];
};

const DEFAULT_EVENT_FORMAT_OPTIONS: FormatEventOptions = {
  descriptionLimit: 300,
  catchPhraseLimit: 150,
};

function resolveFormatOptions(): FormatEventOptions {
  if (isAppsSdkOutputEnabled()) {
    return {
      ...DEFAULT_EVENT_FORMAT_OPTIONS,
      descriptionLimit: undefined,
    };
  }
  return DEFAULT_EVENT_FORMAT_OPTIONS;
}

async function maybeAttachPresentations(
  events: Event[],
  includePresentations: boolean | undefined,
  connpassClient: ConnpassClient,
): Promise<EventWithPresentations[]> {
  if (!includePresentations || events.length === 0) {
    return events as EventWithPresentations[];
  }

  return Promise.all(
    events.map(async (event) => {
      const presentationsResponse = await connpassClient.getEventPresentations(
        event.id,
      );
      return {
        ...event,
        presentations: presentationsResponse.presentations,
      } satisfies EventWithPresentations;
    }),
  );
}

const eventToolsInternal: Tool[] = [
  {
    name: "search_events",
    description:
      "Find Connpass events using date filters and simple search criteria",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "All keywords that must appear in the event title / description",
        },
        anyQuery: {
          type: "string",
          description:
            "Any of these keywords may match (OR search, comma separated is ok)",
        },
        on: {
          description:
            "Specific date(s) in YYYY-MM-DD or YYYYMMDD format (e.g., '2024-12-24' or '20241224'). Accepts a single string or an array",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" }, minItems: 1 },
          ],
        },
        from: {
          type: "string",
          description:
            "Inclusive start date in YYYY-MM-DD or YYYYMMDD format (e.g., '2024-12-01')",
        },
        to: {
          type: "string",
          description: "Inclusive end date in YYYY-MM-DD or YYYYMMDD format for the date range",
        },
        participantNickname: {
          type: "string",
          description: "Limit to events joined by this participant nickname",
        },
        hostNickname: {
          type: "string",
          description: "Filter by the host / organiser nickname",
        },
        groupIds: {
          type: "array",
          items: { type: "number" },
          description: "Only show events from these Connpass group IDs",
        },
        prefectures: {
          description: "Prefecture name(s) to match. Single string or array",
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" }, minItems: 1 },
          ],
        },
        page: {
          type: "integer",
          minimum: 1,
          description: "1-based page number (default 1)",
        },
        pageSize: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description:
            "How many events per page (default 20, Connpass max 100)",
        },
        sort: {
          type: "string",
          enum: [...EVENT_SORT_KEYS],
          description: "Sort by soonest, latest, or newly created events",
        },
      },
    },
    _meta: buildEventsWidgetMeta(),
  },
  {
    name: "get_event_presentations",
    description: "Look up presentation details for a specific event",
    inputSchema: {
      type: "object",
      properties: {
        eventId: {
          type: "integer",
          description: "Connpass event ID (either number or numeric string)",
        },
      },
      required: ["eventId"],
    },
  },
  {
    name: "get_my_upcoming_events",
    description:
      "Get today's and upcoming events for the default or specified user",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "integer",
          description:
            "Connpass user ID to inspect. Falls back to CONNPASS_DEFAULT_USER_ID",
        },
        nickname: {
          type: "string",
          description:
            "Connpass user nickname. If specified, searches for the user by this nickname",
        },
        daysAhead: {
          type: "integer",
          minimum: 1,
          maximum: 60,
          description: "Include events up to this many days ahead (default 7)",
        },
        maxEvents: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum attended events to check (default 30)",
        },
        includePresentations: {
          type: "boolean",
          description:
            "If true, also fetch presentation details for each event (extra API calls, rate-limited)",
        },
      },
    },
    _meta: buildEventsWidgetMeta(),
  },
];

const eventHandlers = {
  async search_events(args: unknown, connpassClient: ConnpassClient) {
    const params = EventSearchInputSchema.parse(args ?? {});
    const searchParams = buildEventSearchParams(params);
    const response = await connpassClient.searchEvents(searchParams);
    return formatEventsResponse(response, resolveFormatOptions());
  },
  async get_event_presentations(args: unknown, connpassClient: ConnpassClient) {
    const { eventId } = EventPresentationsInputSchema.parse(args ?? {});
    const response = await connpassClient.getEventPresentations(eventId);
    return formatPresentationsResponse(response, resolveFormatOptions());
  },
  async get_my_upcoming_events(args: unknown, connpassClient: ConnpassClient) {
    const parsed = MyUpcomingEventsInputSchema.parse(args ?? {});

    let resolvedUserId: number | undefined =
      parsed.userId ?? getDefaultUserId();
    let userNickname: string | undefined;

    // If nickname is provided, search for the user by nickname
    if (parsed.nickname) {
      const userSearchResponse = await connpassClient.searchUsers({
        nickname: parsed.nickname,
      });
      if (userSearchResponse.users.length === 0) {
        throw new Error(`User with nickname "${parsed.nickname}" not found.`);
      }
      const foundUser = userSearchResponse.users[0];
      resolvedUserId = foundUser.id;
      userNickname = foundUser.nickname;
    }

    if (!resolvedUserId) {
      throw new Error(
        "User ID or nickname is required. Pass 'userId', 'nickname', or set CONNPASS_DEFAULT_USER_ID in the environment.",
      );
    }

    const daysAhead = parsed.daysAhead ?? 7;
    const maxEventsToFetch = parsed.maxEvents ?? 30;
    const includePresentations =
      parsed.includePresentations ?? getDefaultIncludePresentations();

    const today = startOfDay(new Date());
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + daysAhead);
    rangeEnd.setHours(23, 59, 59, 999);

    // If nickname was not already resolved, fetch user info by ID
    if (!userNickname) {
      const userResponse = await connpassClient.searchUsers({
        userId: [resolvedUserId],
      });
      if (userResponse.users.length === 0) {
        throw new Error(`User with ID ${resolvedUserId} not found.`);
      }
      const user = userResponse.users.find((u) => u.id === resolvedUserId);
      if (!user) {
        throw new Error(`User with ID ${resolvedUserId} not found.`);
      }
      userNickname = user.nickname;
    }

    const searchResponse = await connpassClient.searchEvents({
      nickname: userNickname,
      ymdFrom: formatDateLabel(today),
      ymdTo: formatDateLabel(rangeEnd),
      order: EVENT_SORT_MAP["start-date-asc"],
      count: maxEventsToFetch,
    });

    const todayEvents = searchResponse.events.filter((event) =>
      isSameDay(new Date(event.startedAt), today),
    );
    const upcomingEvents = searchResponse.events.filter(
      (event) => !isSameDay(new Date(event.startedAt), today),
    );

    const [enrichedToday, enrichedUpcoming] = await Promise.all([
      maybeAttachPresentations(
        todayEvents,
        includePresentations,
        connpassClient,
      ),
      maybeAttachPresentations(
        upcomingEvents,
        includePresentations,
        connpassClient,
      ),
    ]);

    return {
      userId: resolvedUserId,
      today: {
        date: formatDateLabel(today),
        events: formatEventList(enrichedToday, resolveFormatOptions()),
      },
      upcoming: {
        rangeEnd: formatDateLabel(rangeEnd),
        events: formatEventList(enrichedUpcoming, resolveFormatOptions()),
      },
      metadata: {
        inspected: searchResponse.eventsReturned,
        limit: maxEventsToFetch,
        daysAhead,
        includePresentations: Boolean(includePresentations),
      },
    };
  },
};

export type EventToolName = keyof typeof eventHandlers;

export const eventTools = eventToolsInternal;

export function isEventTool(name: string): name is EventToolName {
  return name in eventHandlers;
}

export async function handleEventTool(
  name: EventToolName,
  args: unknown,
  connpassClient: ConnpassClient,
) {
  return eventHandlers[name](args, connpassClient);
}
