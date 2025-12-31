import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { useOpenAiGlobal } from "./use-openai-global";
import type { WidgetState } from "../types/widget-state";

export function useWidgetState(
  defaultState: WidgetState
): readonly [WidgetState, (state: SetStateAction<WidgetState>) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as WidgetState | null;

  const [widgetState, _setWidgetState] = useState<WidgetState>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }
    return defaultState;
  });

  useEffect(() => {
    if (widgetStateFromWindow != null) {
      _setWidgetState(widgetStateFromWindow);
    }
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: SetStateAction<WidgetState>) => {
      _setWidgetState((prevState) => {
        const newState =
          typeof state === "function" ? state(prevState) : state;

        if (newState != null && typeof window !== "undefined") {
          void window.openai?.setWidgetState?.(newState as unknown as Record<string, unknown>);
        }

        return newState;
      });
    },
    []
  );

  return [widgetState, setWidgetState] as const;
}
