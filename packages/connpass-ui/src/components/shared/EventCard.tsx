import type { FormattedEvent } from '../../types'
import { formatDateTime, formatParticipants } from '../../utils'

interface EventCardProps {
  event: FormattedEvent
  onClick: (event: FormattedEvent) => void
  compact?: boolean
}

export function EventCard({ event, onClick, compact }: EventCardProps) {
  return (
    <div
      onClick={() => onClick(event)}
      className="flex gap-3 p-3 rounded-lg cursor-pointer transition-colors"
      style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ui-accent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ui-border)' }}
    >
      {event.imageUrl && !compact && (
        <img
          src={event.imageUrl}
          alt=""
          className="w-16 h-16 rounded-md object-cover shrink-0"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--ui-text)' }}>
          {event.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
          <span>{formatDateTime(event.schedule.start)}</span>
          {event.location?.place && (
            <>
              <span>·</span>
              <span className="truncate">{event.location.place}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
          <span>{formatParticipants(event.participants)}人</span>
          {event.group?.title && (
            <>
              <span>·</span>
              <span className="truncate">{event.group.title}</span>
            </>
          )}
        </div>
        {!compact && event.catchPhrase && (
          <p className="mt-1 text-xs line-clamp-1" style={{ color: 'var(--ui-text-secondary)' }}>
            {event.catchPhrase}
          </p>
        )}
      </div>
    </div>
  )
}
