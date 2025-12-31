import type {
  ConnpassEvent,
  ToolOutput,
  NormalizedToolOutput,
  AgendaSection,
  EventsMetadata,
  SearchToolOutput,
  AgendaToolOutput,
} from "../types/events";
import { formatJapaneseDate, buildUpcomingSubtitle } from "./date-formatting";

function sanitizeEventList(value: unknown): ConnpassEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (event): event is ConnpassEvent => event && typeof event === "object"
  );
}

function isSearchOutput(data: unknown): data is SearchToolOutput {
  return (
    data !== null &&
    typeof data === "object" &&
    "events" in data &&
    Array.isArray((data as SearchToolOutput).events)
  );
}

function isAgendaOutput(data: unknown): data is AgendaToolOutput {
  return (
    data !== null &&
    typeof data === "object" &&
    ("today" in data || "upcoming" in data)
  );
}

export function normalizeToolOutput(
  toolOutput: ToolOutput | null
): NormalizedToolOutput {
  const rawData = toolOutput?.data ?? null;
  const metadata: EventsMetadata | null =
    rawData && typeof rawData === "object" && "metadata" in rawData
      ? (rawData.metadata as EventsMetadata | null)
      : null;

  if (isSearchOutput(rawData)) {
    const events = sanitizeEventList(rawData.events);
    const returnedRaw = Number(rawData.returned ?? events.length ?? 0);
    return {
      variant: "search",
      events,
      returned: Number.isFinite(returnedRaw) ? returnedRaw : events.length,
      sections: [],
      metadata,
      userId: null,
    };
  }

  if (isAgendaOutput(rawData)) {
    const userId =
      typeof rawData.userId === "number" ? rawData.userId : null;
    const todayBlock = rawData.today ?? null;
    const upcomingBlock = rawData.upcoming ?? null;

    const todayEvents = todayBlock
      ? sanitizeEventList(todayBlock.events)
      : [];
    const upcomingEvents = upcomingBlock
      ? sanitizeEventList(upcomingBlock.events)
      : [];

    const sections: AgendaSection[] = [];

    if (todayBlock) {
      sections.push({
        key: "today",
        title: "本日のイベント",
        subtitle: formatJapaneseDate(todayBlock.date) || "本日",
        events: todayEvents,
        emptyText: "今日は参加予定のイベントがありません。",
      });
    }

    if (upcomingBlock) {
      sections.push({
        key: "upcoming",
        title: "今後のイベント",
        subtitle: buildUpcomingSubtitle({
          todayDate: todayBlock?.date ?? null,
          rangeEnd: upcomingBlock.rangeEnd ?? null,
          daysAhead: metadata?.daysAhead,
        }),
        events: upcomingEvents,
        emptyText: "今後予定されているイベントはありません。",
      });
    }

    const combinedEvents = todayEvents.concat(upcomingEvents);
    return {
      variant: "agenda",
      events: combinedEvents,
      sections,
      metadata,
      userId,
      returned: combinedEvents.length,
    };
  }

  const returnedRaw =
    rawData && typeof rawData === "object"
      ? Number((rawData as Record<string, unknown>).returned ?? 0)
      : 0;
  return {
    variant: "search",
    events: [],
    sections: [],
    metadata,
    userId: null,
    returned: Number.isFinite(returnedRaw) ? returnedRaw : 0,
  };
}
