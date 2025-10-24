import { useEffect, useState } from "react";
import type {
  MCPStructuredContent,
  DisplayMode,
  WidgetState,
  ConnpassEvent,
  SearchData,
  AgendaData,
} from "./types";
import { EventCarousel } from "./components/EventCarousel";
import { EventFullscreen } from "./components/EventFullscreen";
import { EventAgenda } from "./components/EventAgenda";
import { EmptyState } from "./components/EmptyState";

// OpenAI Apps SDK types
declare global {
  interface Window {
    openai?: {
      displayMode?: DisplayMode;
      toolOutput?: {
        structuredContent?: MCPStructuredContent;
      };
      widgetState?: WidgetState;
      openExternal?: (params: { href: string }) => void;
      setWidgetState?: (state: WidgetState) => Promise<void>;
      requestDisplayMode?: (params: { mode: DisplayMode }) => Promise<void>;
    };
  }
}

function App() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    window.openai?.displayMode ?? "inline"
  );
  const [structuredContent, setStructuredContent] =
    useState<MCPStructuredContent | null>(
      window.openai?.toolOutput?.structuredContent ?? null
    );
  const [widgetState, setWidgetStateLocal] = useState<WidgetState>(
    window.openai?.widgetState ?? { selectedEventId: null }
  );

  useEffect(() => {
    const handleSetGlobals = (event: CustomEvent) => {
      const globals = event.detail?.globals ?? {};

      if (globals.displayMode !== undefined) {
        setDisplayMode(globals.displayMode);
      }

      if (globals.toolOutput?.structuredContent !== undefined) {
        setStructuredContent(globals.toolOutput.structuredContent);
      }

      if (globals.widgetState !== undefined) {
        setWidgetStateLocal(globals.widgetState);
      }
    };

    window.addEventListener(
      "openai:set_globals" as any,
      handleSetGlobals as EventListener
    );

    return () => {
      window.removeEventListener(
        "openai:set_globals" as any,
        handleSetGlobals as EventListener
      );
    };
  }, []);

  const setWidgetState = async (state: WidgetState) => {
    setWidgetStateLocal(state);
    if (window.openai?.setWidgetState) {
      try {
        await window.openai.setWidgetState(state);
      } catch (error) {
        console.warn("Failed to persist widget state", error);
      }
    }
  };

  const enterFullscreen = async (eventId: number) => {
    await setWidgetState({ selectedEventId: eventId });
    if (window.openai?.requestDisplayMode) {
      try {
        await window.openai.requestDisplayMode({ mode: "fullscreen" });
      } catch (error) {
        console.warn("Failed to request fullscreen", error);
      }
    }
  };

  const exitFullscreen = async () => {
    await setWidgetState({ selectedEventId: null });
    if (window.openai?.requestDisplayMode) {
      try {
        await window.openai.requestDisplayMode({ mode: "inline" });
      } catch (error) {
        console.warn("Failed to exit fullscreen", error);
      }
    }
  };

  const openExternal = (url: string) => {
    if (!url) return;
    try {
      if (window.openai?.openExternal) {
        window.openai.openExternal({ href: url });
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.warn("Failed to open external URL", error);
    }
  };

  // Normalize data
  const normalizeData = () => {
    if (!structuredContent?.data) {
      return { variant: "search", events: [], sections: [] };
    }

    const data = structuredContent.data as SearchData | AgendaData;

    // Check if it's agenda data (has today/upcoming)
    if ("today" in data || "upcoming" in data) {
      const agendaData = data as AgendaData;
      const sections = [];
      const allEvents: ConnpassEvent[] = [];

      if (agendaData.today) {
        sections.push({
          key: "today",
          title: "本日のイベント",
          subtitle: agendaData.today.date,
          events: agendaData.today.events,
          emptyText: "今日は参加予定のイベントがありません。",
        });
        allEvents.push(...agendaData.today.events);
      }

      if (agendaData.upcoming) {
        sections.push({
          key: "upcoming",
          title: "今後のイベント",
          subtitle: agendaData.upcoming.rangeEnd,
          events: agendaData.upcoming.events,
          emptyText: "今後予定されているイベントはありません。",
        });
        allEvents.push(...agendaData.upcoming.events);
      }

      return {
        variant: "agenda",
        events: allEvents,
        sections,
        metadata: agendaData.metadata,
        userId: agendaData.userId,
      };
    }

    // Search data
    const searchData = data as SearchData;
    return {
      variant: "search",
      events: searchData.events || [],
      sections: [],
      metadata: searchData.metadata,
      userId: searchData.userId,
      returned: searchData.returned,
    };
  };

  const normalized = normalizeData();
  const selectedEvent =
    normalized.events.find((e) => e.id === widgetState.selectedEventId) ?? null;

  // Fullscreen mode
  if (displayMode === "fullscreen" && selectedEvent) {
    return (
      <EventFullscreen
        event={selectedEvent}
        onClose={exitFullscreen}
        onOpenExternal={openExternal}
      />
    );
  }

  // Inline mode
  if (normalized.variant === "agenda") {
    return (
      <EventAgenda
        sections={normalized.sections}
        metadata={normalized.metadata}
        userId={normalized.userId}
        onEventClick={enterFullscreen}
        onOpenExternal={openExternal}
      />
    );
  }

  // Search results carousel
  if (normalized.events.length === 0) {
    return (
      <EmptyState
        hasSearched={!!structuredContent}
        returned={normalized.returned ?? 0}
      />
    );
  }

  return (
    <EventCarousel
      events={normalized.events}
      onEventClick={enterFullscreen}
      onOpenExternal={openExternal}
    />
  );
}

export default App;
