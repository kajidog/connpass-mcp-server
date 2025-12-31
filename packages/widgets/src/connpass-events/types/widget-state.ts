export interface WidgetState {
  selectedEventId: number | null;
}

export const DEFAULT_WIDGET_STATE: WidgetState = {
  selectedEventId: null,
};

export function normalizeWidgetState(value: unknown): WidgetState {
  if (
    value &&
    typeof value === "object" &&
    "selectedEventId" in value &&
    value.selectedEventId != null
  ) {
    const numeric = Number(value.selectedEventId);
    if (Number.isFinite(numeric)) {
      return { selectedEventId: numeric };
    }
  }
  return { selectedEventId: null };
}
