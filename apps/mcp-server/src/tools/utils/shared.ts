import type { ConnpassClient, Event } from "@kajidog/connpass-api-client";
import type {
  FormatEventOptions,
  FormattedEvent,
  FormattedPresentationsResponse,
} from "./formatting.js";
import { formatEvent, formatPresentationsResponse } from "./formatting.js";

export const DEFAULT_PAGE_SIZE = 20;

export const EVENT_SORT_KEYS = [
  "start-date-asc",
  "start-date-desc",
  "newly-added",
] as const;
export type EventSortKey = (typeof EVENT_SORT_KEYS)[number];
export const EVENT_SORT_MAP: Record<EventSortKey, 1 | 2 | 3> = {
  "start-date-asc": 1,
  "start-date-desc": 2,
  "newly-added": 3,
};

export const GROUP_SORT_KEYS = [
  "most-events",
  "most-members",
  "newly-added",
] as const;
export type GroupSortKey = (typeof GROUP_SORT_KEYS)[number];
export const GROUP_SORT_MAP: Record<GroupSortKey, 1 | 2 | 3> = {
  "most-events": 1,
  "most-members": 2,
  "newly-added": 3,
};

export const USER_SORT_KEYS = [
  "most-events",
  "most-followers",
  "newly-added",
] as const;
export type UserSortKey = (typeof USER_SORT_KEYS)[number];
export const USER_SORT_MAP: Record<UserSortKey, 1 | 2 | 3> = {
  "most-events": 1,
  "most-followers": 2,
  "newly-added": 3,
};

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatYmd(date: Date, separator: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${separator}${month}${separator}${day}`;
}

function formatAsCompactYmd(date: Date): string {
  return formatYmd(date, "");
}

export function formatDateLabel(date: Date): string {
  return formatYmd(date, "-");
}

export function parseDateInput(
  input: string,
  options?: { style?: "compact" | "hyphenated" },
): string {
  const normalized = input.trim();
  const hyphenFree = normalized.replace(/[-/.]/g, "");

  if (/^\d{8}$/.test(hyphenFree)) {
    const year = Number(hyphenFree.slice(0, 4));
    const month = Number(hyphenFree.slice(4, 6)) - 1;
    const day = Number(hyphenFree.slice(6, 8));
    const candidate = new Date(Date.UTC(year, month, day));
    if (!Number.isNaN(candidate.getTime())) {
      return options?.style === "hyphenated"
        ? formatDateLabel(candidate)
        : formatAsCompactYmd(candidate);
    }
  }

  throw new Error(
    `Invalid date format: ${input}. Expected YYYY-MM-DD or YYYYMMDD format.`,
  );
}

export function toYmdArray(value?: string | string[]): string[] | undefined {
  if (!value) return undefined;
  const inputs = Array.isArray(value) ? value : [value];
  return inputs.map((item) => parseDateInput(item));
}

export function parseHyphenatedDate(input: string): string {
  const parsed = parseDateInput(input, { style: "hyphenated" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return parsed;

  const digitsOnly = parsed.replace(/[^0-9]/g, "");
  if (digitsOnly.length === 8) {
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
  }

  throw new Error(`Could not convert date input to YYYY-MM-DD: ${input}`);
}

export function normalizeStringArray(
  value?: string | string[],
): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

export function normalizeKeywordOr(value?: string): string | undefined {
  if (!value) return undefined;

  const tokens = value
    .split(/[、,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (tokens.length === 0) return undefined;
  return tokens.join(",");
}

export type PaginationParams = { start?: number; count?: number };

export function applyPagination(
  page: number | undefined,
  pageSize: number | undefined,
  options?: { includePagination?: boolean },
): PaginationParams {
  const includePagination = options?.includePagination ?? true;
  if (!includePagination) return {};

  const effectivePageSize = pageSize ?? DEFAULT_PAGE_SIZE;
  const pagination: PaginationParams = {};

  if (page) {
    pagination.start = 1 + (page - 1) * effectivePageSize;
    pagination.count = effectivePageSize;
  } else if (pageSize) {
    pagination.count = effectivePageSize;
  }

  return pagination;
}

// userId -> nickname キャッシュ（TTL付き）
const NICKNAME_CACHE_TTL_MS = 5 * 60 * 1000; // 5分
const userNicknameCache = new Map<
  number,
  { nickname: string; expiresAt: number }
>();

function getCachedNickname(userId: number): string | undefined {
  const entry = userNicknameCache.get(userId);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    userNicknameCache.delete(userId);
    return undefined;
  }
  return entry.nickname;
}

function setCachedNickname(userId: number, nickname: string): void {
  userNicknameCache.set(userId, {
    nickname,
    expiresAt: Date.now() + NICKNAME_CACHE_TTL_MS,
  });
}

export async function resolveUserNickname(
  connpassClient: ConnpassClient,
  options: {
    userId?: number;
    nickname?: string;
    defaultUserId?: number;
  },
): Promise<{ resolvedUserId: number; userNickname: string }> {
  let resolvedUserId: number | undefined =
    options.userId ?? options.defaultUserId;
  let userNickname: string | undefined;

  if (options.nickname) {
    const userSearchResponse = await connpassClient.searchUsers({
      nickname: options.nickname,
    });
    if (userSearchResponse.users.length === 0) {
      throw new Error(`User with nickname "${options.nickname}" not found.`);
    }
    const user = userSearchResponse.users[0];
    resolvedUserId = user.id;
    userNickname = user.nickname;
    setCachedNickname(user.id, user.nickname);
  }

  if (!resolvedUserId) {
    throw new Error(
      "User ID or nickname is required. Pass userId, nickname, or set CONNPASS_DEFAULT_USER_ID.",
    );
  }

  if (!userNickname) {
    const cached = getCachedNickname(resolvedUserId);
    if (cached) {
      userNickname = cached;
    } else {
      const userResponse = await connpassClient.searchUsers({
        userId: [resolvedUserId],
      });
      const found = userResponse.users.find(
        (u: { id: number }) => u.id === resolvedUserId,
      );
      if (!found) {
        throw new Error(`User with ID ${resolvedUserId} not found.`);
      }
      userNickname = found.nickname;
      setCachedNickname(resolvedUserId, found.nickname);
    }
  }

  return { resolvedUserId, userNickname };
}

export function calculateDateRange(
  fromDate?: string,
  toDate?: string,
): { rangeStart: Date; rangeEnd: Date } {
  const today = startOfDay(new Date());
  const rangeStart = fromDate
    ? startOfDay(new Date(parseHyphenatedDate(fromDate)))
    : today;
  const rangeEnd = toDate
    ? startOfDay(new Date(parseHyphenatedDate(toDate)))
    : (() => {
        const defaultEnd = new Date(rangeStart);
        defaultEnd.setDate(defaultEnd.getDate() + 7);
        return defaultEnd;
      })();
  rangeEnd.setHours(23, 59, 59, 999);
  return { rangeStart, rangeEnd };
}

export function groupEventsByDate<T extends { startedAt: string }>(
  events: T[],
): Map<string, T[]> {
  const eventsByDate = new Map<string, T[]>();
  for (const event of events) {
    const eventDate = formatDateLabel(startOfDay(new Date(event.startedAt)));
    if (!eventsByDate.has(eventDate)) {
      eventsByDate.set(eventDate, []);
    }
    eventsByDate.get(eventDate)!.push(event);
  }
  return eventsByDate;
}

export async function fetchEventDetail(
  connpassClient: ConnpassClient,
  eventId: number,
  formatOptions?: FormatEventOptions,
): Promise<{
  event: Event;
  formatted: FormattedEvent;
  presentations: FormattedPresentationsResponse | undefined;
}> {
  const [eventsResponse, presentationsResponse] = await Promise.all([
    connpassClient.searchEvents({ eventId: [eventId], count: 1 }),
    connpassClient.getEventPresentations(eventId).catch(() => undefined),
  ]);

  const event = eventsResponse.events[0];
  if (!event) {
    throw new Error(`Event with ID ${eventId} not found.`);
  }

  const formatted = formatEvent(event, formatOptions);
  const presentations = presentationsResponse
    ? formatPresentationsResponse(presentationsResponse)
    : undefined;

  return { event, formatted, presentations };
}
