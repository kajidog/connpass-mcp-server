import { useCallback } from "react";
import { useOpenAiGlobal } from "./use-openai-global";
import type { DisplayMode } from "../types/openai";

export function useDisplayMode() {
  const displayMode = useOpenAiGlobal("displayMode") ?? "inline";

  const requestDisplayMode = useCallback(async (mode: DisplayMode) => {
    if (typeof window === "undefined" || !window.openai?.requestDisplayMode) {
      return { mode: displayMode };
    }
    return window.openai.requestDisplayMode({ mode });
  }, [displayMode]);

  return { displayMode, requestDisplayMode };
}
