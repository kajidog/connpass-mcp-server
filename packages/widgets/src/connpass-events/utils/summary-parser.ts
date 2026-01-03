export type SummaryBlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "link"
  | "note"
  | "schedule";

export interface HeadingBlock {
  type: "heading";
  text: string;
}

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface ListBlock {
  type: "list";
  items: string[];
}

export interface LinkBlock {
  type: "link";
  href: string;
  label?: string;
}

export interface NoteBlock {
  type: "note";
  text: string;
}

export interface ScheduleEntry {
  time: string;
  description?: string;
  details: string[];
}

export interface ScheduleBlock {
  type: "schedule";
  entries: ScheduleEntry[];
  headers?: string[];
}

export type SummaryBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | LinkBlock
  | NoteBlock
  | ScheduleBlock;

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
]);

const SUMMARY_SKIP_HEADINGS = new Set(["日時", "時間", "内容", "スケジュール", "備考"]);
const SCHEDULE_HEADER_CANDIDATES = new Set(["時間", "内容"]);

/**
 * Detect table header rows like "時間 内容 備考" or "時間 内容"
 */
function isTableHeaderLine(value: string): boolean {
  const normalized = value.trim();
  // Common table header patterns
  return /^時間\s+内容/.test(normalized);
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
    .replace(/\s*[-〜–—]\s*/gu, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parse a schedule line that may contain time and description in one line.
 * Examples:
 *   "13:00 開場" => { time: "13:00", description: "開場" }
 *   "13:10 - 13:15 オープニング" => { time: "13:10 - 13:15", description: "オープニング" }
 *   "13:00" => { time: "13:00", description: undefined }
 */
function parseScheduleLine(line: string): { time: string; description?: string } {
  // Match time patterns: "13:00" or "13:00 - 14:00" or "13:00 〜 14:00"
  const timePattern = /^(\d{1,2}:\d{2}(?:\s*[-〜–—]\s*\d{1,2}:\d{2})?)\s*/;
  const match = timePattern.exec(line);
  
  if (!match) {
    return { time: normalizeScheduleLabel(line) };
  }
  
  const time = normalizeScheduleLabel(match[1]);
  const rest = line.slice(match[0].length).trim();
  
  return {
    time,
    description: rest || undefined,
  };
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

export function buildSummaryBlocks(
  summary: string | undefined | null
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

    if (SUMMARY_SKIP_HEADINGS.has(headingText)) {
      if (SCHEDULE_HEADER_CANDIDATES.has(headingText)) {
        if (!pendingScheduleHeaders.includes(headingText)) {
          pendingScheduleHeaders.push(headingText);
        }
      }
      index += 1;
      continue;
    }

    // Skip table header rows like "時間 内容 備考"
    if (isTableHeaderLine(current)) {
      index += 1;
      continue;
    }

    if (SUMMARY_SECTION_HEADINGS.has(headingText)) {
      if (!(blocks.length === 0 && headingText === "概要")) {
        blocks.push({ type: "heading", text: headingText });
      }
      pendingScheduleHeaders = [];
      index += 1;
      continue;
    }

    if (isScheduleLine(current)) {
      const entries: ScheduleEntry[] = [];
      while (index < segments.length && isScheduleLine(segments[index])) {
        const lineRaw = segments[index];
        index += 1;
        
        // Parse time and description from the same line (for table-converted format)
        const parsed = parseScheduleLine(lineRaw);
        const entry: ScheduleEntry = {
          time: parsed.time,
          description: parsed.description,
          details: [],
        };

        // Only look for additional content if description wasn't in the same line
        if (!entry.description) {
          while (index < segments.length) {
            const peek = segments[index];
            const peekHeading = SUMMARY_SECTION_HEADINGS.has(
              normalizeHeadingText(peek)
            );
            const peekSkip = SUMMARY_SKIP_HEADINGS.has(
              normalizeHeadingText(peek)
            );
            if (peekHeading || peekSkip || isScheduleLine(peek)) {
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
            break;
          }
        }

        entries.push(entry);
      }

      if (entries.length > 0) {
        const scheduleBlock: ScheduleBlock = { type: "schedule", entries };
        if (pendingScheduleHeaders.length > 0) {
          scheduleBlock.headers = pendingScheduleHeaders.slice(0, 2);
        }
        blocks.push(scheduleBlock);
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
