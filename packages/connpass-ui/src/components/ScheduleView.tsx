import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { SearchScheduleParams } from "../hooks/connpassToolClient";
import type { FormattedEvent, ScheduleResult } from "../types";
import {
  DATE_PRESET_OPTIONS,
  type DatePreset,
  type DatePresetKey,
  createDatePreset,
} from "../utils/datePreset";
import { EventCard } from "./shared/EventCard";
import { Spinner } from "./shared/Spinner";
import {
  SyncedSectionNav,
  type SyncedSectionNavItem,
} from "./shared/SyncedSectionNav";

const DATE_NAV_SCROLL_OFFSET = 72;

interface ScheduleViewProps {
  result: ScheduleResult | null;
  initialNickname: string;
  loading: boolean;
  error: string | null;
  onSearchSchedule: (params: SearchScheduleParams) => void;
  onSelectEvent: (event: FormattedEvent) => void;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  if (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day)
  ) {
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

function formatDateParts(dateStr: string): { label: string; weekday: string } {
  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { label: dateStr, weekday: "" };
  }
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return { label: `${month}/${day}`, weekday: WEEKDAYS[date.getDay()] };
}

function formatDateHeader(dateStr: string): string {
  const { label, weekday } = formatDateParts(dateStr);
  return weekday ? `${label}(${weekday})` : label;
}

function inferPresetFromDates(from: string, to: string): DatePreset {
  for (const [key] of DATE_PRESET_OPTIONS) {
    const range = createDatePreset(key);
    if (range.from === from && range.to === to) return key;
  }
  return "custom";
}

export function ScheduleView({
  result,
  initialNickname,
  loading,
  error,
  onSearchSchedule,
  onSelectEvent,
}: ScheduleViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const initialFrom = result?.metadata?.fromDate ?? "";
  const initialTo = result?.metadata?.toDate ?? "";
  const [datePreset, setDatePreset] = useState<DatePreset>(() =>
    initialFrom && initialTo
      ? inferPresetFromDates(initialFrom, initialTo)
      : "today",
  );
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [nickname, setNickname] = useState(initialNickname);

  useEffect(() => {
    if (initialNickname) setNickname(initialNickname);
  }, [initialNickname]);

  const sections = useMemo(() => result?.sections ?? [], [result]);

  const dateItems = useMemo<SyncedSectionNavItem[]>(
    () =>
      sections.map((section) => {
        const { label, weekday } = formatDateParts(section.date);
        const countLabel = `${section.events.length}件`;
        return {
          id: section.date,
          label,
          meta: weekday ? `${weekday}・${countLabel}` : countLabel,
          ariaLabel: `${formatDateHeader(section.date)} ${countLabel}`,
        };
      }),
    [sections],
  );

  const handlePreset = (preset: DatePresetKey) => {
    const range = createDatePreset(preset);
    setDatePreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const isCustomDate = datePreset === "custom";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params: SearchScheduleParams = {};
    const trimmedNickname = nickname.trim();
    if (trimmedNickname) {
      params.nickname = trimmedNickname;
    } else if (result?.userId) {
      params.userId = result.userId;
    }
    if (isCustomDate) {
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
    } else {
      const range = createDatePreset(datePreset as DatePresetKey);
      params.fromDate = range.from;
      params.toDate = range.to;
    }
    onSearchSchedule(params);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex flex-col gap-3 overflow-y-auto p-2"
      style={{ maxHeight: "600px" }}
    >
      {/* Period selector */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 p-3 rounded-lg"
        style={{ background: "var(--ui-surface)" }}
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="schedule-nickname"
            className="text-xs font-medium"
            style={{ color: "var(--ui-text)" }}
          >
            ユーザー
          </label>
          <input
            id="schedule-nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="connpassのニックネーム"
            className="px-3 py-2 rounded-md text-sm"
            style={{
              background: "var(--ui-bg)",
              border: "1px solid var(--ui-border)",
              color: "var(--ui-text)",
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--ui-text)" }}
          >
            期間
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DATE_PRESET_OPTIONS.map(([preset, label]) => {
              const selected = datePreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className="px-3 py-1.5 rounded-full text-xs"
                  style={{
                    background: selected ? "var(--ui-accent)" : "var(--ui-bg)",
                    border: `1px solid ${selected ? "var(--ui-accent)" : "var(--ui-border)"}`,
                    color: selected ? "#fff" : "var(--ui-text)",
                  }}
                >
                  {label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setDatePreset("custom")}
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: isCustomDate ? "var(--ui-accent)" : "var(--ui-bg)",
                border: `1px solid ${isCustomDate ? "var(--ui-accent)" : "var(--ui-border)"}`,
                color: isCustomDate ? "#fff" : "var(--ui-text)",
              }}
            >
              カスタム
            </button>
          </div>
          {isCustomDate && (
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor="schedule-from"
                  className="text-[11px]"
                  style={{ color: "var(--ui-text-secondary)" }}
                >
                  開始日
                </label>
                <input
                  id="schedule-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1.5 rounded-md text-xs"
                  style={{
                    background: "var(--ui-bg)",
                    border: "1px solid var(--ui-border)",
                    color: "var(--ui-text)",
                  }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label
                  htmlFor="schedule-to"
                  className="text-[11px]"
                  style={{ color: "var(--ui-text-secondary)" }}
                >
                  終了日
                </label>
                <input
                  id="schedule-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1.5 rounded-md text-xs"
                  style={{
                    background: "var(--ui-bg)",
                    border: "1px solid var(--ui-border)",
                    color: "var(--ui-text)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md text-sm font-medium text-white"
          style={{
            background: loading
              ? "var(--ui-text-secondary)"
              : "var(--ui-accent)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "検索中..." : "更新"}
        </button>
      </form>

      {error && (
        <div
          className="px-3 py-2 rounded-md text-xs text-red-500"
          style={{ background: "var(--ui-surface)" }}
        >
          {error}
        </div>
      )}

      {loading && <Spinner />}

      {result && !loading && (
        <>
          {dateItems.length > 0 && (
            <div
              className="sticky top-0 z-20 -mx-2 px-2 py-2"
              style={{
                background: "var(--ui-bg)",
                borderBottom: "1px solid var(--ui-border)",
              }}
            >
              <SyncedSectionNav
                items={dateItems}
                ariaLabel="日付"
                scrollOffset={DATE_NAV_SCROLL_OFFSET}
                scrollContainerRef={scrollContainerRef}
              />
            </div>
          )}
          <div
            className="px-1 text-xs"
            style={{ color: "var(--ui-text-secondary)" }}
          >
            {result.metadata.fromDate} 〜 {result.metadata.toDate} (
            {sections.reduce((sum, s) => sum + s.events.length, 0)}件)
          </div>
          {sections.map((section) => (
            <div
              id={section.date}
              key={section.date}
              className="flex flex-col gap-2"
            >
              <h3
                className="text-xs font-bold px-1 pt-1"
                style={{ color: "var(--ui-text)" }}
              >
                {formatDateHeader(section.date)}
              </h3>
              {section.events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={onSelectEvent}
                  compact
                />
              ))}
            </div>
          ))}
          {sections.length === 0 && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--ui-text-secondary)" }}
            >
              この期間のイベントはありません
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "var(--ui-text-secondary)" }}
        >
          AIがスケジュール検索を実行すると、ここに結果が表示されます
        </div>
      )}
    </div>
  );
}
