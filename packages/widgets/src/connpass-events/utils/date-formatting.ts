import type { ConnpassEvent } from "../types/events";

export function formatJapaneseDate(ymd: string | undefined | null): string {
  if (!ymd) return "";
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(ymd));
  if (!match) return String(ymd);
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  if (!Number.isFinite(parsed.valueOf())) {
    return String(ymd);
  }
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(parsed);
  } catch {
    return String(ymd);
  }
}

export function buildUpcomingSubtitle(context: {
  todayDate?: string | null;
  rangeEnd?: string | null;
  daysAhead?: number;
}): string {
  const parts: string[] = [];
  if (
    typeof context.daysAhead === "number" &&
    Number.isFinite(context.daysAhead)
  ) {
    parts.push(`あと${context.daysAhead}日`);
  }
  if (context.todayDate && context.rangeEnd) {
    parts.push(
      `${formatJapaneseDate(context.todayDate)} 〜 ${formatJapaneseDate(context.rangeEnd)}`
    );
  } else if (context.rangeEnd) {
    parts.push(`〜 ${formatJapaneseDate(context.rangeEnd)}`);
  }
  return parts.join(" / ");
}

export function formatDateRange(event: ConnpassEvent): string {
  try {
    const start = new Date(event.schedule?.start ?? "");
    const end = new Date(event.schedule?.end ?? "");
    if (
      !Number.isFinite(start.valueOf()) ||
      !Number.isFinite(end.valueOf())
    ) {
      return "日程未定";
    }
    const sameDay =
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate();
    const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
      month: "short",
      day: "numeric",
      weekday: "short",
    });
    const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const startStr = `${dateFormatter.format(start)} ${timeFormatter.format(start)}`;
    const endStr = sameDay
      ? timeFormatter.format(end)
      : `${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
    return `${startStr} 〜 ${endStr}`;
  } catch {
    return "日程未定";
  }
}

export function participantsLabel(
  participants: ConnpassEvent["participants"] | undefined
): string {
  if (!participants) return "0";
  const accepted = Number(participants.accepted ?? 0);
  const limit = Number(participants.limit ?? 0);
  const waiting = Number(participants.waiting ?? 0);
  if (limit > 0) {
    const waitText = waiting > 0 ? ` / 補欠 ${waiting}` : "";
    return `${accepted} / ${limit}${waitText}`;
  }
  return waiting > 0 ? `${accepted} (+補欠 ${waiting})` : `${accepted}`;
}
