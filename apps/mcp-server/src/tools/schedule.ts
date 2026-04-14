import { z } from "zod";
import { withErrorHandling } from "./utils/errorHandler.js";
import {
  FORMAT_PRESETS,
  formatEventList,
  summarizeEventsResponse,
} from "./utils/formatting.js";
import { registerAppToolIfEnabled } from "./utils/registration.js";
import { connpassResourceUri } from "./utils/resource.js";
import {
  EVENT_SORT_MAP,
  calculateDateRange,
  formatDateLabel,
  groupEventsByDate,
  resolveUserNickname,
} from "./utils/shared.js";
import type { ToolDeps } from "./utils/types.js";

const ScheduleInputSchema = z.object({
  userId: z.number().int().positive().describe("Connpass user ID").optional(),
  nickname: z.string().min(1).describe("Connpass user nickname").optional(),
  fromDate: z
    .string()
    .min(1)
    .describe("Start date (YYYY-MM-DD). Defaults to today.")
    .optional(),
  toDate: z
    .string()
    .min(1)
    .describe("End date (YYYY-MM-DD). Defaults to +7 days.")
    .optional(),
  maxEvents: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Maximum events to check (default 30)")
    .optional(),
  includeDetails: z
    .boolean()
    .describe("Include event description (up to 200 chars)")
    .default(false)
    .optional(),
});

export function registerScheduleTools(deps: ToolDeps): void {
  const { server, connpassClient, config } = deps;

  registerAppToolIfEnabled(
    server,
    "search_schedule",
    {
      title: "Search Schedule",
      description: "Search user's schedule - events within a date range",
      inputSchema: ScheduleInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: {
        ui: { resourceUri: connpassResourceUri },
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const parsed = ScheduleInputSchema.parse(args ?? {});

      const { resolvedUserId, userNickname } = await resolveUserNickname(
        connpassClient,
        {
          userId: parsed.userId,
          nickname: parsed.nickname,
          defaultUserId: config.defaultUserId,
        },
      );

      const maxEventsToFetch = parsed.maxEvents ?? 30;
      const { rangeStart, rangeEnd } = calculateDateRange(
        parsed.fromDate,
        parsed.toDate,
      );

      const searchResponse = await connpassClient.searchEvents({
        nickname: userNickname,
        ymdFrom: formatDateLabel(rangeStart),
        ymdTo: formatDateLabel(rangeEnd),
        order: EVENT_SORT_MAP["start-date-asc"],
        count: maxEventsToFetch,
      });

      const eventsByDate = groupEventsByDate(searchResponse.events);
      const sortedDates = Array.from(eventsByDate.keys()).sort();
      const sections = sortedDates.map((date) => ({
        date,
        events: formatEventList(
          eventsByDate.get(date)!,
          parsed.includeDetails
            ? FORMAT_PRESETS.detailed
            : FORMAT_PRESETS.default,
        ),
      }));

      const result = {
        userId: resolvedUserId,
        sections,
        metadata: {
          fromDate: formatDateLabel(rangeStart),
          toDate: formatDateLabel(rangeEnd),
          inspected: searchResponse.eventsReturned,
          limit: maxEventsToFetch,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: summarizeEventsResponse(
              {
                returned: sections.reduce(
                  (count, section) => count + section.events.length,
                  0,
                ),
                available: sections.reduce(
                  (count, section) => count + section.events.length,
                  0,
                ),
                start: 1,
                events: sections.flatMap((section) => section.events),
              },
              "schedule",
            ),
          },
        ],
        structuredContent: {
          kind: "schedule",
          data: result,
        },
      };
    }),
  );
}
