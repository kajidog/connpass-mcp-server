import type { Event } from "@kajidog/connpass-api-client";
import { z } from "zod";
import { formatEventList } from "../utils/formatting.js";
import { registerAppToolIfEnabled } from "../utils/registration.js";
import { connpassResourceUri } from "../utils/resource.js";
import { EVENT_SORT_MAP, parseHyphenatedDate } from "../utils/shared.js";
import type { ToolDeps } from "../utils/types.js";

const UIScheduleInputSchema = z.object({
  userId: z.number().int().positive().optional(),
  nickname: z.string().min(1).optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  maxEvents: z.number().int().min(1).max(100).optional(),
});

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SCHEDULE_FORMAT_OPTIONS = {
  descriptionLimit: 0 as const,
  catchPhraseLimit: 100,
};

// userId -> nickname キャッシュ
const userNicknameCache = new Map<number, string>();

export function registerUIScheduleTool(deps: ToolDeps): void {
  const { server, connpassClient, config } = deps;

  registerAppToolIfEnabled(
    server,
    "_search_schedule",
    {
      title: "Search Schedule (UI)",
      description: "Internal: re-search schedule from UI",
      inputSchema: UIScheduleInputSchema,
      _meta: {
        ui: {
          resourceUri: connpassResourceUri,
          visibility: ["app"],
        },
      },
    },
    async (args: Record<string, unknown>) => {
      const parsed = UIScheduleInputSchema.parse(args ?? {});

      let resolvedUserId: number | undefined =
        parsed.userId ?? config.defaultUserId;
      let userNickname: string | undefined;

      if (parsed.nickname) {
        const userSearchResponse = await connpassClient.searchUsers({
          nickname: parsed.nickname,
        });
        if (userSearchResponse.users.length === 0) {
          throw new Error(`User with nickname "${parsed.nickname}" not found.`);
        }
        resolvedUserId = userSearchResponse.users[0].id;
        userNickname = userSearchResponse.users[0].nickname;
        userNicknameCache.set(resolvedUserId, userNickname);
      }

      if (!resolvedUserId) {
        throw new Error("User ID or nickname is required.");
      }

      const maxEventsToFetch = parsed.maxEvents ?? 30;

      const today = startOfDay(new Date());
      const rangeStart = parsed.fromDate
        ? startOfDay(new Date(parseHyphenatedDate(parsed.fromDate)))
        : today;
      const rangeEnd = parsed.toDate
        ? startOfDay(new Date(parseHyphenatedDate(parsed.toDate)))
        : (() => {
            const defaultEnd = new Date(rangeStart);
            defaultEnd.setDate(defaultEnd.getDate() + 7);
            return defaultEnd;
          })();
      rangeEnd.setHours(23, 59, 59, 999);

      if (!userNickname) {
        // キャッシュからニックネームを取得
        userNickname = userNicknameCache.get(resolvedUserId);
        if (!userNickname) {
          const userResponse = await connpassClient.searchUsers({
            userId: [resolvedUserId],
          });
          if (userResponse.users.length === 0)
            throw new Error(`User with ID ${resolvedUserId} not found.`);
          userNickname = userResponse.users.find(
            (u) => u.id === resolvedUserId,
          )?.nickname;
          if (!userNickname)
            throw new Error(`User with ID ${resolvedUserId} not found.`);
          userNicknameCache.set(resolvedUserId, userNickname);
        }
      }

      const searchResponse = await connpassClient.searchEvents({
        nickname: userNickname,
        ymdFrom: formatDateLabel(rangeStart),
        ymdTo: formatDateLabel(rangeEnd),
        order: EVENT_SORT_MAP["start-date-asc"],
        count: maxEventsToFetch,
      });

      const eventsByDate = new Map<string, Event[]>();
      for (const event of searchResponse.events) {
        const eventDate = formatDateLabel(
          startOfDay(new Date(event.startedAt)),
        );
        if (!eventsByDate.has(eventDate)) eventsByDate.set(eventDate, []);
        eventsByDate.get(eventDate)!.push(event);
      }

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
