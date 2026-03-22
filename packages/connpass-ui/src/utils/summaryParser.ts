export type SummaryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "link"; href: string; label?: string }
  | { type: "note"; text: string }
  | { type: "keyValue"; rows: Array<{ key: string; value: string }> }
  | { type: "table"; headers: string[]; rows: string[][] }
  | {
      type: "schedule";
      entries: Array<{
        time: string;
        speaker?: string;
        description?: string;
        details: string[];
      }>;
      headers?: string[];
    };

const SUMMARY_SECTION_HEADINGS = new Set([
  "概要",
  "この会について",
  "対象",
  "会場",
  "持ち物",
  "参加費",
  "Slack",
  "情報共有",
  "最寄り駅",
  "アクセス",
  "連絡先",
  "開催概要",
  "プログラム",
]);

const SUMMARY_SKIP_HEADINGS = new Set([
  "日時",
  "時間",
  "発表者",
  "内容",
  "スケジュール",
  "備考",
  "項目",
]);
const SCHEDULE_HEADER_CANDIDATES = new Set(["時間", "発表者", "内容", "項目"]);

function isTableHeaderLine(value: string): boolean {
  // Tab-separated headers should be handled by the table parser as the first row
  if (value.includes("\t")) return false;
  const normalized = value.trim();
  return /^(時間|項目)(?:\s+発表者)?\s+内容/.test(normalized);
}

function normalizeHeadingText(text: string | undefined | null): string {
  return String(text ?? "")
    .trim()
    .replace(/[：:]+$/, "");
}

function isScheduleLine(value: string): boolean {
  return /^\d{1,2}:\d{2}/.test(value);
}

function normalizeScheduleLabel(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/[｜|]/g, " ")
    .replace(/\s*[-〜–—]\s*/gu, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScheduleLine(line: string): {
  time: string;
  description?: string;
} {
  const normalizedLine = line.replace(/[｜|]/g, " ");
  const timePattern = /^(\d{1,2}:\d{2}(?:\s*[-〜–—]\s*\d{1,2}:\d{2})?)\s*/;
  const match = timePattern.exec(normalizedLine);

  if (!match) {
    return { time: normalizeScheduleLabel(normalizedLine) };
  }

  const time = normalizeScheduleLabel(match[1]);
  const rest = normalizedLine.slice(match[0].length).trim();

  return {
    time,
    description: rest || undefined,
  };
}

function parseScheduleRange(
  value: string,
): { start: number; end: number } | null {
  const normalized = value.replace(/[｜|]/g, " ");
  const match = /^(\d{1,2}):(\d{2})(?:\s*[-〜–—]\s*(\d{1,2}):(\d{2}))?/.exec(
    normalized,
  );
  if (!match) return null;

  const start = Number(match[1]) * 60 + Number(match[2]);
  const end =
    match[3] && match[4] ? Number(match[3]) * 60 + Number(match[4]) : start;
  return { start, end };
}

function isNestedSchedule(parentTime: string, childLine: string): boolean {
  const parent = parseScheduleRange(parentTime);
  const child = parseScheduleRange(childLine);
  if (!parent || !child) return false;
  if (parent.start === child.start && parent.end === child.end) return false;
  return child.start >= parent.start && child.end <= parent.end;
}

function collectNestedScheduleDetail(
  segments: string[],
  startIndex: number,
): { text: string; nextIndex: number } {
  const lines = [normalizeScheduleLabel(segments[startIndex])];
  let index = startIndex + 1;

  while (index < segments.length) {
    const peek = segments[index];
    const normalizedPeek = normalizeHeadingText(peek);

    if (
      SUMMARY_SECTION_HEADINGS.has(normalizedPeek) ||
      SUMMARY_SKIP_HEADINGS.has(normalizedPeek) ||
      isScheduleLine(peek) ||
      peek.startsWith("## ")
    ) {
      break;
    }

    lines.push(peek);
    index += 1;
  }

  return {
    text: lines.join("\n"),
    nextIndex: index,
  };
}

function collectKeyValueRows(
  segments: string[],
  startIndex: number,
): { rows: Array<{ key: string; value: string }>; nextIndex: number } {
  const rows: Array<{ key: string; value: string }> = [];
  let index = startIndex;

  while (index < segments.length) {
    const key = segments[index];
    const normalizedKey = normalizeHeadingText(key);

    if (
      SUMMARY_SECTION_HEADINGS.has(normalizedKey) ||
      isScheduleLine(key) ||
      isBulletLine(key) ||
      isLikelyUrl(key) ||
      isNoteLine(key)
    ) {
      break;
    }

    if (SUMMARY_SKIP_HEADINGS.has(normalizedKey)) {
      index += 1;
      continue;
    }

    const value = segments[index + 1];
    if (!value) break;

    const normalizedValue = normalizeHeadingText(value);
    if (
      SUMMARY_SECTION_HEADINGS.has(normalizedValue) ||
      SUMMARY_SKIP_HEADINGS.has(normalizedValue) ||
      isScheduleLine(value)
    ) {
      break;
    }

    rows.push({ key, value });
    index += 2;
  }

  return { rows, nextIndex: index };
}

function isBulletLine(value: string): boolean {
  return /^[-*・◆■●▶︎]\s*/.test(value);
}

function stripBullet(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/^[-*・◆■●▶︎]\s*/, "")
    .trim();
}

function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isNoteLine(value: string): boolean {
  return /^※/.test(value);
}

function isTabularLine(value: string): boolean {
  return value.includes("\t");
}

function collectTableBlock(
  segments: string[],
  startIndex: number,
): { headers: string[]; rows: string[][]; nextIndex: number } | null {
  const rows: string[][] = [];
  let index = startIndex;

  while (index < segments.length && isTabularLine(segments[index])) {
    const cells = segments[index]
      .split("\t")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length >= 2) {
      rows.push(cells);
    }
    index += 1;
  }

  if (rows.length < 2) return null;

  const [headers, ...body] = rows;
  return {
    headers,
    rows: body,
    nextIndex: index,
  };
}

export function buildSummaryBlocks(
  summary: string | undefined | null,
): SummaryBlock[] {
  const segments = String(summary ?? "")
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const blocks: SummaryBlock[] = [];
  let index = 0;
  let pendingScheduleHeaders: string[] = [];

  while (index < segments.length) {
    const current = segments[index];
    const headingText = normalizeHeadingText(current);

    // Markdown-style heading marker from stripHtml (## prefix)
    if (current.startsWith("## ")) {
      const text = normalizeHeadingText(current.slice(3));
      if (text && !SUMMARY_SKIP_HEADINGS.has(text)) {
        blocks.push({ type: "heading", text });
        pendingScheduleHeaders = [];
      }
      index += 1;
      continue;
    }

    if (SUMMARY_SKIP_HEADINGS.has(headingText)) {
      if (
        SCHEDULE_HEADER_CANDIDATES.has(headingText) &&
        !pendingScheduleHeaders.includes(headingText)
      ) {
        pendingScheduleHeaders.push(headingText);
      }
      index += 1;
      continue;
    }

    const inlineHeaders = detectInlineHeaders(current);
    if (inlineHeaders) {
      pendingScheduleHeaders = inlineHeaders;
      index += 1;
      continue;
    }

    if (isTableHeaderLine(current)) {
      index += 1;
      continue;
    }

    if (isTabularLine(current)) {
      const table = collectTableBlock(segments, index);
      if (table) {
        blocks.push({
          type: "table",
          headers: table.headers,
          rows: table.rows,
        });
        index = table.nextIndex;
        pendingScheduleHeaders = [];
        continue;
      }
    }

    if (SUMMARY_SECTION_HEADINGS.has(headingText)) {
      blocks.push({ type: "heading", text: headingText });
      pendingScheduleHeaders = [];
      index += 1;

      if (headingText === "開催概要") {
        const table = collectKeyValueRows(segments, index);
        if (table.rows.length > 0) {
          blocks.push({ type: "keyValue", rows: table.rows });
          index = table.nextIndex;
        }
      }

      continue;
    }

    if (isScheduleLine(current)) {
      const entries: Array<{
        time: string;
        speaker?: string;
        description?: string;
        details: string[];
      }> = [];

      while (index < segments.length && isScheduleLine(segments[index])) {
        const parsed = parseScheduleLine(segments[index]);
        index += 1;

        const entry = {
          time: parsed.time,
          speaker: undefined as string | undefined,
          description: parsed.description,
          details: [] as string[],
        };

        while (index < segments.length) {
          const peek = segments[index];
          const normalizedPeek = normalizeHeadingText(peek);
          if (
            SUMMARY_SECTION_HEADINGS.has(normalizedPeek) ||
            SUMMARY_SKIP_HEADINGS.has(normalizedPeek) ||
            peek.startsWith("## ")
          ) {
            break;
          }

          if (isScheduleLine(peek)) {
            if (isNestedSchedule(entry.time, peek)) {
              const nested = collectNestedScheduleDetail(segments, index);
              entry.details.push(nested.text);
              index = nested.nextIndex;
              continue;
            }
            break;
          }

          if (isBulletLine(peek)) {
            entry.details.push(stripBullet(peek));
            index += 1;
            continue;
          }

          if (isNoteLine(peek)) {
            entry.details.push(peek);
            index += 1;
            continue;
          }

          if (!entry.description) {
            entry.description = peek;
            index += 1;
            continue;
          }

          if (!entry.speaker && pendingScheduleHeaders.includes("発表者")) {
            entry.speaker = entry.description;
            entry.description = peek;
            index += 1;
            continue;
          }

          entry.details.push(peek);
          index += 1;
        }

        entries.push(entry);
      }

      if (entries.length > 0) {
        blocks.push({
          type: "schedule",
          entries,
          headers:
            pendingScheduleHeaders.length > 0
              ? pendingScheduleHeaders.slice(0, 3)
              : undefined,
        });
      }
      pendingScheduleHeaders = [];
      continue;
    }

    if (isBulletLine(current)) {
      const items: string[] = [];
      while (index < segments.length && isBulletLine(segments[index])) {
        items.push(stripBullet(segments[index]));
        index += 1;
      }
      blocks.push({ type: "list", items });
      pendingScheduleHeaders = [];
      continue;
    }

    if (isNoteLine(current)) {
      blocks.push({ type: "note", text: current });
      pendingScheduleHeaders = [];
      index += 1;
      continue;
    }

    if (isLikelyUrl(current)) {
      blocks.push({ type: "link", href: current });
      pendingScheduleHeaders = [];
      index += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: current });
    pendingScheduleHeaders = [];
    index += 1;
  }

  return blocks;
}
function detectInlineHeaders(value: string): string[] | null {
  // Tab-separated headers should be handled by the table parser as the first row
  if (value.includes("\t")) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized === "時間 発表者 内容") return ["時間", "発表者", "内容"];
  if (normalized === "時間 内容") return ["時間", "内容"];
  if (normalized === "項目 内容") return ["項目", "内容"];
  return null;
}
