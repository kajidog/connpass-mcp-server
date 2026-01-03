import type { AgendaSection, EventsMetadata } from "../../shared/types/events";
import { AgendaCard } from "../../shared/components/AgendaCard";

interface ScheduleViewProps {
  sections: AgendaSection[];
  metadata: EventsMetadata | null;
  userId: number | null;
  isLoading?: boolean;
}

function MetadataChips({
  metadata,
  userId,
}: {
  metadata: EventsMetadata | null;
  userId: number | null;
}) {
  const chips: { label: string; value: string | number }[] = [];

  if (userId != null) {
    chips.push({ label: "ユーザーID", value: userId });
  }
  if (metadata?.fromDate != null && metadata?.toDate != null) {
    chips.push({ label: "期間", value: `${metadata.fromDate} ~ ${metadata.toDate}` });
  } else if (metadata?.fromDate != null) {
    chips.push({ label: "開始日", value: metadata.fromDate });
  } else if (metadata?.toDate != null) {
    chips.push({ label: "終了日", value: metadata.toDate });
  }
  if (metadata?.limit != null) {
    chips.push({ label: "取得件数", value: metadata.limit });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
        >
          <span className="font-medium">{chip.label}:</span>
          <span>{chip.value}</span>
        </span>
      ))}
    </div>
  );
}

function SectionEmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center min-h-[80px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-xl p-4 text-zinc-500 dark:text-zinc-400 text-sm text-center">
      {text}
    </div>
  );
}

export function ScheduleView({
  sections,
  metadata,
  userId,
  isLoading,
}: ScheduleViewProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[200px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-center">
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>
        <p>スケジュールを取得中</p>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[200px] border border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl p-6 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 text-center">
        <span className="text-4xl">📅</span>
        <p>予定はありません</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <MetadataChips metadata={metadata} userId={userId} />

      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.key}>
            <header className="mb-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                {section.title}
              </h2>
              {section.subtitle && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {section.subtitle}
                </p>
              )}
            </header>

            {section.events.length === 0 ? (
              <SectionEmptyState text={section.emptyText} />
            ) : (
              <div className="flex flex-col gap-3">
                {section.events.map((event) => (
                  <AgendaCard
                    key={event.id}
                    event={event}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
