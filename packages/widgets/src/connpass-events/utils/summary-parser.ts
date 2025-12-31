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

const SUMMARY_SKIP_HEADINGS = new Set(["日時", "時間", "内容", "スケジュール"]);
const SCHEDULE_HEADER_CANDIDATES = new Set(["時間", "内容"]);

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
        const timeRaw = segments[index];
        index += 1;
        const entry: ScheduleEntry = {
          time: normalizeScheduleLabel(timeRaw),
          description: undefined,
          details: [],
        };

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
