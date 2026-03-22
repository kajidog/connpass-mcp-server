export type DatePresetKey = "today" | "tomorrow" | "this-week" | "this-month";

export type DatePreset = DatePresetKey | "custom";

export const DATE_PRESET_OPTIONS = [
  ["today", "今日"],
  ["tomorrow", "明日"],
  ["this-week", "今週"],
  ["this-month", "今月"],
] as const;

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDatePreset(preset: DatePresetKey) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else if (preset === "this-week") {
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    end.setDate(start.getDate() + 6);
  } else if (preset === "this-month") {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  return {
    from: formatDateInput(start),
    to: formatDateInput(end),
  };
}
