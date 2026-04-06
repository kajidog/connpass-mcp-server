import { z } from "zod";
import { formatEventList } from "../utils/formatting.js";
import { registerAppToolIfEnabled } from "../utils/registration.js";
import { connpassResourceUri } from "../utils/resource.js";
import {
  EVENT_SORT_MAP,
  calculateDateRange,
  formatDateLabel,
  groupEventsByDate,
  resolveUserNickname,
} from "../utils/shared.js";
import type { ToolDeps } from "../utils/types.js";

const UIScheduleInputSchema = z.object({
  userId: z.number().int().positive().optional(),
  nickname: z.string().min(1).optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  maxEvents: z.number().int().min(1).max(100).optional(),
});

const SCHEDULE_FORMAT_OPTIONS = {
  descriptionLimit: 0 as const,
  catchPhraseLimit: 100,
};

export function registerUIScheduleTool(deps: ToolDeps): void {
  const { server, connpassClient, config } = deps;

  registerAppToolIfEnabled(
    server,
    "_search_schedule",
    {
      title: "Search Schedule (UI)",
      description: "Internal: re-search schedule from UI",
      inputSchema: UIScheduleInputSchema,
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
      const parsed = UIScheduleInputSchema.parse(args ?? {});

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
          SCHEDULE_FORMAT_OPTIONS,
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
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: {
          kind: "schedule",
          data: result,
        },
      };
    },
  );
}
