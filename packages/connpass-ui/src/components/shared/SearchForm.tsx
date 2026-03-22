import { useEffect, useState } from "react";
import type { SearchEventsParams } from "../../hooks/connpassToolClient";
import type { PrefectureOption, SearchFormValues } from "../../types";
import {
  DATE_PRESET_OPTIONS,
  type DatePresetKey,
  createDatePreset,
} from "../../utils/datePreset";

interface SearchFormProps {
  values: SearchFormValues;
  prefectures: PrefectureOption[];
  onSearch: (params: SearchEventsParams) => void;
  loading: boolean;
}

function normalizeValues(values: SearchFormValues): SearchFormValues {
  return {
    query: values.query ?? "",
    anyQuery: values.anyQuery ?? "",
    from: values.from ?? "",
    to: values.to ?? "",
    datePreset: values.datePreset ?? "today",
    prefecture: values.prefecture ?? "",
    company: values.company ?? "",
    minParticipants: values.minParticipants ?? "",
    minCapacity: values.minCapacity ?? "",
    sort: values.sort ?? "start-date-asc",
    showAdvanced: values.showAdvanced ?? false,
    page: values.page ?? 1,
    pageSize: values.pageSize ?? 5,
  };
}

export function SearchForm({
  values,
  prefectures,
  onSearch,
  loading,
}: SearchFormProps) {
  const [formValues, setFormValues] = useState<SearchFormValues>(() =>
    normalizeValues(values),
  );

  useEffect(() => {
    setFormValues((prev) => {
      const next = normalizeValues(values);

      if (
        prev.query === next.query &&
        prev.anyQuery === next.anyQuery &&
        prev.from === next.from &&
        prev.to === next.to &&
        prev.datePreset === next.datePreset &&
        prev.prefecture === next.prefecture &&
        prev.company === next.company &&
        prev.minParticipants === next.minParticipants &&
        prev.minCapacity === next.minCapacity &&
        prev.sort === next.sort &&
        prev.showAdvanced === next.showAdvanced &&
        prev.page === next.page &&
        prev.pageSize === next.pageSize
      ) {
        return prev;
      }

      return next;
    });
  }, [values]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      query: formValues.query.trim() || undefined,
      anyQuery: formValues.anyQuery.trim() || undefined,
      from: formValues.from || undefined,
      to: formValues.to || undefined,
      prefectures: formValues.prefecture || undefined,
      companyQuery: formValues.company.trim() || undefined,
      minAccepted: formValues.minParticipants
        ? Number(formValues.minParticipants)
        : undefined,
      minCapacity: formValues.minCapacity
        ? Number(formValues.minCapacity)
        : undefined,
      datePreset: formValues.datePreset,
      sort: formValues.sort,
      showAdvanced: formValues.showAdvanced,
      page: 1,
      pageSize: formValues.pageSize,
    });
  };

  const handlePreset = (preset: DatePresetKey) => {
    const range = createDatePreset(preset);
    setFormValues((prev) => ({
      ...prev,
      datePreset: preset,
      from: range.from,
      to: range.to,
    }));
  };

  const isCustomDate = formValues.datePreset === "custom";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 p-3"
      style={{ background: "var(--ui-surface)", borderRadius: "8px" }}
    >
      {/* OR検索キーワード */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="connpass-any-query"
          className="text-xs font-medium"
          style={{ color: "var(--ui-text)" }}
        >
          キーワード
        </label>
        <span
          className="text-[11px]"
          style={{ color: "var(--ui-text-secondary)" }}
        >
          カンマ区切りでいずれかに一致するイベントを検索（OR検索）
        </span>
        <input
          id="connpass-any-query"
          type="text"
          value={formValues.anyQuery}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, anyQuery: e.target.value }))
          }
          placeholder="例: React, Rust, AI"
          className="px-3 py-2 rounded-md text-sm"
          style={{
            background: "var(--ui-bg)",
            border: "1px solid var(--ui-border)",
            color: "var(--ui-text)",
          }}
        />
      </div>

      {/* 期間プリセット（詳細条件の外） */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs font-medium"
          style={{ color: "var(--ui-text)" }}
        >
          期間
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DATE_PRESET_OPTIONS.map(([preset, label]) => {
            const selected = formValues.datePreset === preset;
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
            onClick={() =>
              setFormValues((prev) => ({ ...prev, datePreset: "custom" }))
            }
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
                htmlFor="connpass-from"
                className="text-[11px]"
                style={{ color: "var(--ui-text-secondary)" }}
              >
                開始日
              </label>
              <input
                id="connpass-from"
                type="date"
                value={formValues.from}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, from: e.target.value }))
                }
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
                htmlFor="connpass-to"
                className="text-[11px]"
                style={{ color: "var(--ui-text-secondary)" }}
              >
                終了日
              </label>
              <input
                id="connpass-to"
                type="date"
                value={formValues.to}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, to: e.target.value }))
                }
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

      {/* 件数・ソート・詳細トグル */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <button
          type="button"
          onClick={() =>
            setFormValues((prev) => ({
              ...prev,
              showAdvanced: !prev.showAdvanced,
            }))
          }
          className="px-3 py-2 rounded-md text-xs justify-self-start flex items-center gap-1"
          style={{
            background: "var(--ui-bg)",
            border: "1px solid var(--ui-border)",
            color: "var(--ui-text)",
          }}
        >
          詳細条件 {formValues.showAdvanced ? "▲" : "▼"}
        </button>

        <div className="flex flex-col gap-0.5">
          <label
            htmlFor="connpass-page-size"
            className="text-[11px] text-right"
            style={{ color: "var(--ui-text-secondary)" }}
          >
            検索件数
          </label>
          <select
            id="connpass-page-size"
            value={String(formValues.pageSize)}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                pageSize: Number(e.target.value),
              }))
            }
            className="px-2 py-2 rounded-md text-xs"
            style={{
              background: "var(--ui-bg)",
              border: "1px solid var(--ui-border)",
              color: "var(--ui-text)",
            }}
          >
            <option value="5">5件</option>
            <option value="10">10件</option>
            <option value="20">20件</option>
          </select>
        </div>

        <div className="flex flex-col gap-0.5">
          <label
            htmlFor="connpass-sort"
            className="text-[11px] text-right"
            style={{ color: "var(--ui-text-secondary)" }}
          >
            ソート
          </label>
          <select
            id="connpass-sort"
            value={formValues.sort}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                sort: e.target.value as SearchFormValues["sort"],
              }))
            }
            className="px-2 py-2 rounded-md text-xs"
            style={{
              background: "var(--ui-bg)",
              border: "1px solid var(--ui-border)",
              color: "var(--ui-text)",
            }}
          >
            <option value="start-date-asc">日時順</option>
            <option value="participant-count-desc">参加人数順</option>
            <option value="title-asc">イベント名順</option>
          </select>
        </div>
      </div>

      {/* 詳細条件 */}
      {formValues.showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex flex-col gap-1">
            <label
              htmlFor="connpass-prefecture"
              className="text-xs font-medium"
              style={{ color: "var(--ui-text)" }}
            >
              都道府県
            </label>
            <span
              className="text-[11px]"
              style={{ color: "var(--ui-text-secondary)" }}
            >
              開催地域で絞り込みます
            </span>
            <select
              id="connpass-prefecture"
              value={formValues.prefecture}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  prefecture: e.target.value,
                }))
              }
              className="px-3 py-2 rounded-md text-xs"
              style={{
                background: "var(--ui-bg)",
                border: "1px solid var(--ui-border)",
                color: "var(--ui-text)",
              }}
            >
              <option value="">すべて</option>
              {prefectures.map((prefecture) => (
                <option key={prefecture.code} value={prefecture.code}>
                  {prefecture.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex flex-col gap-1">
            <label
              htmlFor="connpass-company"
              className="text-xs font-medium"
              style={{ color: "var(--ui-text)" }}
            >
              会社名・主催名
            </label>
            <span
              className="text-[11px]"
              style={{ color: "var(--ui-text-secondary)" }}
            >
              主催者名やグループ名に含まれる文字列で絞り込みます
            </span>
            <input
              id="connpass-company"
              type="text"
              value={formValues.company}
              onChange={(e) =>
                setFormValues((prev) => ({ ...prev, company: e.target.value }))
              }
              placeholder="例: DeNA, サイバーエージェント"
              className="px-3 py-2 rounded-md text-xs"
              style={{
                background: "var(--ui-bg)",
                border: "1px solid var(--ui-border)",
                color: "var(--ui-text)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="connpass-min-participants"
              className="text-xs font-medium"
              style={{ color: "var(--ui-text)" }}
            >
              参加人数以上
            </label>
            <input
              id="connpass-min-participants"
              type="number"
              min="0"
              value={formValues.minParticipants}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  minParticipants: e.target.value,
                }))
              }
              className="px-3 py-2 rounded-md text-xs"
              style={{
                background: "var(--ui-bg)",
                border: "1px solid var(--ui-border)",
                color: "var(--ui-text)",
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="connpass-min-capacity"
              className="text-xs font-medium"
              style={{ color: "var(--ui-text)" }}
            >
              募集人数以上
            </label>
            <input
              id="connpass-min-capacity"
              type="number"
              min="0"
              value={formValues.minCapacity}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  minCapacity: e.target.value,
                }))
              }
              className="px-3 py-2 rounded-md text-xs"
              style={{
                background: "var(--ui-bg)",
                border: "1px solid var(--ui-border)",
                color: "var(--ui-text)",
              }}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-md text-sm font-medium text-white"
        style={{
          background: loading ? "var(--ui-text-secondary)" : "var(--ui-accent)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "検索中..." : "検索"}
      </button>
    </form>
  );
}
