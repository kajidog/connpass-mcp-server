import { X, Calendar, MapPin, User, Hash, ExternalLink } from "lucide-react";
import type { ConnpassEvent } from "../types/events";
import { formatDateRange, participantsLabel } from "../utils/date-formatting";
import { Badge } from "./Badge";
import { SummaryRenderer } from "./SummaryRenderer";
import { PresentationList } from "./PresentationList";

interface DetailViewProps {
  event: ConnpassEvent;
  onClose: () => void;
}

function InfoRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  href?: string;
}) {
  if (!value) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (href) {
      e.preventDefault();
      window.openai?.openExternal?.({ href });
    }
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500 mt-0.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        {href ? (
          <a
            href={href}
            onClick={handleClick}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {value}
          </a>
        ) : (
          <div className="text-sm text-zinc-900 dark:text-white">{value}</div>
        )}
      </div>
    </div>
  );
}

export function DetailView({ event, onClose }: DetailViewProps) {
  const handleOpenExternal = () => {
    window.openai?.openExternal?.({ href: event.url });
  };

  const fallbackLabel = event.group?.title || event.owner.displayName;

  return (
    <div className="fixed inset-0 bg-white dark:bg-zinc-900 z-50 overflow-y-auto">
      {/* Hero */}
      <div className="relative w-full aspect-video max-h-[min(40vh,320px)] bg-blue-500/10 dark:bg-blue-400/10 border-b border-zinc-200 dark:border-zinc-700">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-lg font-semibold px-6 text-center">
            <span className="max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
              {fallbackLabel}
            </span>
          </div>
        )}

        {/* Badge overlay */}
        <div className="absolute bottom-3 right-3">
          <Badge
            participants={event.participants}
            className="bg-white/90 dark:bg-zinc-800/90 shadow-lg"
          />
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center gap-3 z-10">
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
        <h1 className="flex-1 text-lg font-bold text-zinc-900 dark:text-white line-clamp-2">
          {event.title}
        </h1>
      </header>

      {/* Content */}
      <main className="p-4 pb-8 max-w-3xl mx-auto">
        {/* CTA Button - prominent placement below title */}
        <section className="mb-6">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg"
            onClick={handleOpenExternal}
          >
            <ExternalLink size={18} />
            <span>Connpass でイベントを見る</span>
          </button>
        </section>

        {/* Meta section */}
        <section className="mb-6">
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-1">
            <InfoRow
              icon={<Calendar size={18} />}
              label="日時"
              value={formatDateRange(event)}
            />
            <InfoRow
              icon={<User size={18} />}
              label="参加者"
              value={participantsLabel(event.participants)}
            />
            {event.location?.place && (
              <InfoRow
                icon={<MapPin size={18} />}
                label="場所"
                value={
                  event.location.address
                    ? `${event.location.place} (${event.location.address})`
                    : event.location.place
                }
              />
            )}
          </div>
        </section>

        {/* Info grid */}
        <section className="mb-6 grid grid-cols-2 gap-4">
          {event.owner && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                主催者
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-white">
                {event.owner.displayName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                @{event.owner.nickname}
              </div>
            </div>
          )}

          {event.group?.title && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                グループ
              </div>
              {event.group.url ? (
                <a
                  href={event.group.url}
                  onClick={(e) => {
                    e.preventDefault();
                    window.openai?.openExternal?.({ href: event.group!.url! });
                  }}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {event.group.title}
                </a>
              ) : (
                <div className="text-sm font-medium text-zinc-900 dark:text-white">
                  {event.group.title}
                </div>
              )}
            </div>
          )}

          {event.hashTag && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                ハッシュタグ
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                <Hash size={14} />
                <span>{event.hashTag}</span>
              </div>
            </div>
          )}
        </section>

        {/* Catch phrase */}
        {event.catchPhrase && (
          <section className="mb-6">
            <blockquote className="text-base text-zinc-700 dark:text-zinc-300 italic border-l-4 border-blue-500 pl-4 py-1">
              {event.catchPhrase}
            </blockquote>
          </section>
        )}

        {/* Summary */}
        {event.summary && (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">
              概要
            </h2>
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
              <SummaryRenderer summary={event.summary} />
            </div>
          </section>
        )}

        {/* Presentations */}
        {event.presentations && event.presentations.length > 0 && (
          <PresentationList presentations={event.presentations} />
        )}
      </main>
    </div>
  );
}
