import { Calendar, MapPin, ExternalLink } from "lucide-react";
import type { ConnpassEvent } from "../types/events";
import { formatDateRange } from "../utils/date-formatting";
import { Badge } from "./Badge";

interface EventCardProps {
  event: ConnpassEvent;
  onShowDetail: (event: ConnpassEvent) => void;
}

export function EventCard({ event, onShowDetail }: EventCardProps) {
  const handleOpenExternal = () => {
    window.openai?.openExternal?.({ href: event.url });
  };

  const fallbackLabel = event.group?.title || event.owner.displayName;

  return (
    <article className="relative flex-shrink-0 w-[280px] flex flex-col gap-4 min-h-[260px] bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 rounded-2xl shadow-lg p-4">
      {/* Media */}
      <div className="relative overflow-hidden rounded-xl aspect-video -m-4 mb-0 bg-blue-500/10 dark:bg-blue-400/10 max-h-[200px]">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-sm font-semibold px-3 text-center">
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap w-full">
              {fallbackLabel}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 flex-grow">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug">
          {event.title}
        </h2>

        <Badge participants={event.participants} />

        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <Calendar size={16} className="flex-shrink-0" />
          <span className="truncate">{formatDateRange(event)}</span>
        </div>

        {event.location?.place && (
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <MapPin size={16} className="flex-shrink-0" />
            <span className="truncate">{event.location.place}</span>
          </div>
        )}

        {event.catchPhrase && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
            {event.catchPhrase}
          </p>
        )}

        {event.hashTag && (
          <span className="inline-block text-xs text-blue-600 dark:text-blue-400 font-medium">
            #{event.hashTag}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          className="flex-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          onClick={() => onShowDetail(event)}
        >
          詳細を見る
        </button>
        <button
          type="button"
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
          onClick={handleOpenExternal}
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </article>
  );
}
