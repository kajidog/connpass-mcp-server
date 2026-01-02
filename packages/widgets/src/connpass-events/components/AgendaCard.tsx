import { Calendar, MapPin, ExternalLink } from "lucide-react";
import type { ConnpassEvent } from "../types/events";
import { formatDateRange } from "../utils/date-formatting";
import { Badge } from "./Badge";

interface AgendaCardProps {
  event: ConnpassEvent;
  onShowDetail: (event: ConnpassEvent) => void;
}

export function AgendaCard({ event, onShowDetail }: AgendaCardProps) {
  const handleOpenExternal = () => {
    window.openai?.openExternal?.({ href: event.url });
  };

  const ownerLabel =
    event.owner?.displayName || event.owner?.nickname || "Connpass";
  const fallbackLabel = event.group?.title || ownerLabel;

  return (
    <article className="flex gap-4 bg-white dark:bg-zinc-800/90 border border-black/5 dark:border-white/10 rounded-2xl shadow-md p-4 hover:shadow-lg transition-shadow">
      {/* Media */}
      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-blue-500/10 dark:bg-blue-400/10">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-xs font-medium px-1 text-center">
            {fallbackLabel}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white line-clamp-2 leading-snug">
          {event.title}
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge participants={event.participants} className="text-[10px] px-2 py-0.5" />

          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            <Calendar size={12} />
            <span>{formatDateRange(event)}</span>
          </div>
        </div>

        {event.location?.place && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <MapPin size={12} />
            <span className="truncate">{event.location.place}</span>
          </div>
        )}

        {event.catchPhrase && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
            {event.catchPhrase}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            className="px-2.5 py-1 text-xs font-medium rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            onClick={() => onShowDetail(event)}
          >
            詳細を見る
          </button>
          <button
            type="button"
            className="px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
            onClick={handleOpenExternal}
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
