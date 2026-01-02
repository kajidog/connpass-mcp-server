import { useEffect, useCallback, useMemo } from "react";
import { useOpenAiGlobal } from "../connpass-events/hooks/use-openai-global";
import { useWidgetState } from "../connpass-events/hooks/use-widget-state";
import { useDisplayMode } from "../connpass-events/hooks/use-display-mode";
import { normalizeToolOutput } from "../connpass-events/utils/normalize-tool-output";
import { DEFAULT_WIDGET_STATE, normalizeWidgetState } from "../connpass-events/types/widget-state";
import type { ConnpassEvent, ToolOutput } from "../connpass-events/types/events";
import { ScheduleView } from "./components/ScheduleView";
import { DetailView } from "../connpass-events/components/DetailView";

export function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ToolOutput | null;
  const { displayMode, requestDisplayMode } = useDisplayMode();
  const [widgetState, setWidgetState] = useWidgetState(DEFAULT_WIDGET_STATE);

  // Debug logging
  console.log("[schedule-app] toolOutput received:", {
    hasToolOutput: !!toolOutput,
    toolOutputKeys: toolOutput ? Object.keys(toolOutput) : [],
    hasData: !!toolOutput?.data,
    dataKeys: toolOutput?.data ? Object.keys(toolOutput.data as object) : [],
  });

  // Normalize tool output
  const normalizedOutput = useMemo(
    () => normalizeToolOutput(toolOutput),
    [toolOutput]
  );

  // Debug logging for normalized output
  console.log("[schedule-app] normalizedOutput:", {
    variant: normalizedOutput.variant,
    sectionsCount: normalizedOutput.sections.length,
    eventsCount: normalizedOutput.events.length,
  });

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

  // Default: schedule view (agenda style)
  const isLoading = toolOutput == null;
  return (
    <ScheduleView
      sections={normalizedOutput.sections}
      metadata={normalizedOutput.metadata}
      userId={normalizedOutput.userId}
      onShowDetail={handleShowDetail}
      isLoading={isLoading}
    />
  );
}
