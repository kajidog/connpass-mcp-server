import { useEffect, useCallback, useMemo } from "react";
import { useOpenAiGlobal } from "./hooks/use-openai-global";
import { useWidgetState } from "./hooks/use-widget-state";
import { useDisplayMode } from "./hooks/use-display-mode";
import { normalizeToolOutput } from "./utils/normalize-tool-output";
import { DEFAULT_WIDGET_STATE, normalizeWidgetState } from "./types/widget-state";
import type { ConnpassEvent, ToolOutput } from "./types/events";
import { Carousel } from "./components/Carousel";
import { AgendaView } from "./components/AgendaView";
import { DetailView } from "./components/DetailView";

export function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ToolOutput | null;
  const { displayMode, requestDisplayMode } = useDisplayMode();
  const [widgetState, setWidgetState] = useWidgetState(DEFAULT_WIDGET_STATE);

  // Normalize tool output
  const normalizedOutput = useMemo(
    () => normalizeToolOutput(toolOutput),
    [toolOutput]
  );

  // Find selected event
  const selectedEvent = useMemo(() => {
    if (widgetState.selectedEventId == null) return null;
    return (
      normalizedOutput.events.find(
        (e) => e.id === widgetState.selectedEventId
      ) ?? null
    );
  }, [widgetState.selectedEventId, normalizedOutput.events]);

  // Body scroll lock for fullscreen
  useEffect(() => {
    const shouldLock = displayMode === "fullscreen" && selectedEvent != null;
    if (shouldLock) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [displayMode, selectedEvent]);

  // Handle showing detail view
  const handleShowDetail = useCallback(
    async (event: ConnpassEvent) => {
      setWidgetState({ selectedEventId: event.id });
      await requestDisplayMode("fullscreen");
    },
    [setWidgetState, requestDisplayMode]
  );

  // Handle closing detail view
  const handleCloseDetail = useCallback(async () => {
    setWidgetState({ selectedEventId: null });
    await requestDisplayMode("inline");
  }, [setWidgetState, requestDisplayMode]);

  // Restore widget state on mount
  useEffect(() => {
    const rawState = window.openai?.widgetState;
    if (rawState) {
      const normalized = normalizeWidgetState(rawState);
      if (normalized.selectedEventId != null) {
        setWidgetState(normalized);
      }
    }
  }, [setWidgetState]);

  // Show fullscreen detail if we have selected event and are in fullscreen mode
  if (displayMode === "fullscreen" && selectedEvent) {
    return <DetailView event={selectedEvent} onClose={handleCloseDetail} />;
  }

  // Show inline view based on variant
  if (normalizedOutput.variant === "agenda") {
    return (
      <AgendaView
        sections={normalizedOutput.sections}
        metadata={normalizedOutput.metadata}
        userId={normalizedOutput.userId}
        onShowDetail={handleShowDetail}
      />
    );
  }

  // Default: carousel view
  const isLoading = toolOutput == null;
  return (
    <Carousel events={normalizedOutput.events} onShowDetail={handleShowDetail} isLoading={isLoading} />
  );
}
