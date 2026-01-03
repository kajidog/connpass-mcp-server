import { useMemo } from "react";
import { useOpenAiGlobal } from "../shared/hooks/use-openai-global";
import { normalizeToolOutput } from "../shared/utils/normalize-tool-output";
import type { ToolOutput } from "../shared/types/events";
import { ScheduleView } from "./components/ScheduleView";

export function App() {
  const toolOutput = useOpenAiGlobal("toolOutput") as ToolOutput | null;

  // Normalize tool output
  const normalizedOutput = useMemo(
    () => normalizeToolOutput(toolOutput),
    [toolOutput]
  );

  const isLoading = toolOutput == null;
  return (
    <ScheduleView
      sections={normalizedOutput.sections}
      metadata={normalizedOutput.metadata}
      userId={normalizedOutput.userId}
      isLoading={isLoading}
    />
  );
}
