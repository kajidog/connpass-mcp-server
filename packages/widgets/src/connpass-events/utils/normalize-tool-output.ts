import type {
  ConnpassEvent,
  ToolOutput,
  NormalizedToolOutput,
  AgendaSection,
  EventsMetadata,
  SearchToolOutput,
  AgendaToolOutput,
} from "../types/events";
import { formatJapaneseDate } from "./date-formatting";

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
    "sections" in data &&
    Array.isArray((data as AgendaToolOutput).sections)
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
    const dateSections = rawData.sections ?? [];

    const sections: AgendaSection[] = [];
    const allEvents: ConnpassEvent[] = [];

    for (const dateSection of dateSections) {
      const events = sanitizeEventList(dateSection.events);
      allEvents.push(...events);

      const formattedDate = formatJapaneseDate(dateSection.date);
      sections.push({
        key: dateSection.date,
        title: formattedDate || dateSection.date,
        subtitle: "",
        events,
        emptyText: "この日のイベントはありません。",
      });
    }

    return {
      variant: "agenda",
      events: allEvents,
      sections,
      metadata,
      userId,
      returned: allEvents.length,
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
