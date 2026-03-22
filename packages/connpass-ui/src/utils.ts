import type {
  DetailFact,
  EventSearchResult,
  FormattedEvent,
  PrefectureOption,
  ScheduleResult,
} from "./types";

function unwrapToolPayload(result: unknown): Record<string, unknown> | null {
  if (!result || typeof result !== "object") return null;

  const record = result as Record<string, unknown>;
  const structuredContent =
    record.structuredContent && typeof record.structuredContent === "object"
      ? (record.structuredContent as Record<string, unknown>)
      : null;

  if (structuredContent) {
    return structuredContent;
  }

  return record;
}

function parseTextContent(
  result: Record<string, unknown>,
): Record<string, unknown> | null {
  const directText = typeof result.text === "string" ? result.text : null;
  if (directText) {
    try {
      const parsed = JSON.parse(directText);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  const content = Array.isArray(result.content) ? result.content : [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as Record<string, unknown>).text;
    if (typeof text !== "string") continue;
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      // ignore parse failure and continue
    }
  }

  return null;
}

function extractTextContent(result: Record<string, unknown>): string | null {
  const directText = typeof result.text === "string" ? result.text : null;
  if (directText) return directText;

  const content = Array.isArray(result.content) ? result.content : [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const text = (item as Record<string, unknown>).text;
    if (typeof text === "string" && text.trim()) {
      return text;
    }
  }

  return null;
}

/**
 * ツール結果からイベント検索データを抽出する
 */
export function extractEventSearchData(
  result: unknown,
): EventSearchResult | null {
  const data = unwrapToolPayload(result);
  if (!data) return null;

  // structuredContent.data パターン
  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (Array.isArray(inner.events)) {
      return inner as unknown as EventSearchResult;
    }
  }

  // 直接パターン
  if (Array.isArray(data.events)) {
    return data as unknown as EventSearchResult;
  }

  // テキストからJSONパース
  const parsed = parseTextContent(data);
  if (parsed && Array.isArray(parsed.events)) {
    return parsed as unknown as EventSearchResult;
  }

  return null;
}

/**
 * ツール結果からスケジュールデータを抽出する
 */
export function extractScheduleData(result: unknown): ScheduleResult | null {
  const data = unwrapToolPayload(result);
  if (!data) return null;

  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (Array.isArray(inner.sections)) {
      return inner as unknown as ScheduleResult;
    }
  }

  if (Array.isArray(data.sections)) {
    return data as unknown as ScheduleResult;
  }

  const parsed = parseTextContent(data);
  if (parsed && Array.isArray(parsed.sections)) {
    return parsed as unknown as ScheduleResult;
  }

  return null;
}

export function extractEventDetailData(result: unknown): FormattedEvent | null {
  const data = unwrapToolPayload(result);
  if (!data) return null;

  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (inner.event && typeof inner.event === "object") {
      const event = inner.event as FormattedEvent;
      const presentationsRecord =
        inner.presentations && typeof inner.presentations === "object"
          ? (inner.presentations as Record<string, unknown>)
          : null;
      const presentations = Array.isArray(presentationsRecord?.presentations)
        ? presentationsRecord.presentations
        : undefined;

      return presentations?.length
        ? {
            ...event,
            presentations: presentations as FormattedEvent["presentations"],
          }
        : event;
    }
  }

  if (data.event && typeof data.event === "object") {
    return data.event as FormattedEvent;
  }

  const parsed = parseTextContent(data);
  if (parsed?.event && typeof parsed.event === "object") {
    return parsed.event as FormattedEvent;
  }
  if (parsed && typeof parsed === "object" && typeof parsed.id === "number") {
    return parsed as unknown as FormattedEvent;
  }

  return null;
}

export function extractPrefectureListData(
  result: unknown,
): PrefectureOption[] | null {
  const data = unwrapToolPayload(result);
  if (!data) return null;

  if (data.data && typeof data.data === "object") {
    const inner = data.data as Record<string, unknown>;
    if (Array.isArray(inner.prefectures)) {
      return inner.prefectures as PrefectureOption[];
    }
  }

  if (Array.isArray(data.prefectures)) {
    return data.prefectures as PrefectureOption[];
  }

  const parsed = parseTextContent(data);
  if (parsed && Array.isArray(parsed.prefectures)) {
    return parsed.prefectures as PrefectureOption[];
  }

  return null;
}

export function extractToolErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  return extractTextContent(result as Record<string, unknown>);
}

/**
 * 日時を表示用にフォーマットする
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday}) ${hours}:${minutes}`;
}

/**
 * 参加者情報を表示用にフォーマットする
 */
export function formatParticipants(participants: {
  accepted: number;
  waiting: number;
  limit?: number;
}): string {
  const parts: string[] = [];
  if (participants.limit) {
    parts.push(`${participants.accepted}/${participants.limit}`);
  } else {
    parts.push(`${participants.accepted}`);
  }
  if (participants.waiting > 0) {
    parts.push(`(補欠${participants.waiting})`);
  }
  return parts.join(" ");
}

export function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (start.toDateString() === end.toDateString()) {
    return `${formatDateTime(startIso)} 〜 ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  return `${formatDateTime(startIso)} 〜 ${formatDateTime(endIso)}`;
}

export function stripHtmlTags(value: string | undefined): string {
  if (!value) return "";

  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildDetailFacts(event: FormattedEvent): DetailFact[] {
  const facts: DetailFact[] = [
    {
      label: "参加状況",
      value: `${formatParticipants(event.participants)}人`,
      tone: "accent",
    },
  ];

  if (event.group?.title) {
    facts.push({
      label: "コミュニティ",
      value: event.group.title,
    });
  }

  if (event.owner.displayName || event.owner.nickname) {
    facts.push({
      label: "主催",
      value: [
        event.owner.displayName,
        event.owner.nickname ? `@${event.owner.nickname}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (event.location?.place || event.location?.address) {
    facts.push({
      label: "会場",
      value: [event.location.place, event.location.address]
        .filter(Boolean)
        .join(" / "),
    });
  }

  if (event.hashTag) {
    facts.push({
      label: "ハッシュタグ",
      value: `#${event.hashTag.replace(/^#/, "")}`,
      tone: "muted",
    });
  }

  return facts;
}
