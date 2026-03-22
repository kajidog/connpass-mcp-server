import type { FormattedEvent } from '../types'
import { buildDetailFacts, formatDateRange } from '../utils'

import { SummaryRenderer } from './shared/SummaryRenderer'

interface EventDetailProps {
  event: FormattedEvent
  loading: boolean
  error: string | null
  onBack: () => void
  onOpenLink: (url: string) => void
}

export function EventDetail({
  event,
  loading,
  error,
  onBack,
  onOpenLink,
}: EventDetailProps) {
  const facts = buildDetailFacts(event)

  return (
    <div className="flex flex-col gap-4 p-3 overflow-y-auto" style={{ maxHeight: '600px' }}>
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="px-2 py-1 rounded-md text-xs"
          style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)', color: 'var(--ui-text)' }}
        >
          ← 戻る
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-md text-xs text-red-500" style={{ background: 'var(--ui-surface)' }}>
          {error}
        </div>
      )}

      <section
        className="rounded-[20px]"
        style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}
      >
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            className="w-full object-cover"
            style={{ maxHeight: '240px' }}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span
                className="rounded-full px-2.5 py-1 font-medium"
                style={{ background: 'color-mix(in srgb, var(--ui-accent) 14%, white)', color: 'var(--ui-accent)' }}
              >
                {formatDateRange(event.schedule.start, event.schedule.end)}
              </span>
              {event.group?.title && (
                <span
                  className="rounded-full px-2.5 py-1"
                  style={{ background: 'var(--ui-bg)', color: 'var(--ui-text-secondary)', border: '1px solid var(--ui-border)' }}
                >
                  {event.group.title}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold leading-snug" style={{ color: 'var(--ui-text)' }}>
              {event.title}
            </h2>

            {event.catchPhrase && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>
                {event.catchPhrase}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {facts.map((fact) => (
              <div
                key={`${fact.label}-${fact.value}`}
                className="rounded-xl px-3 py-2"
                style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}
              >
                <div className="text-[11px]" style={{ color: 'var(--ui-text-secondary)' }}>
                  {fact.label}
                </div>
                <div
                  className="mt-1 text-sm font-medium leading-snug"
                  style={{
                    color:
                      fact.tone === 'accent'
                        ? 'var(--ui-accent)'
                        : fact.tone === 'muted'
                          ? 'var(--ui-text-secondary)'
                          : 'var(--ui-text)',
                  }}
                >
                  {fact.value}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onOpenLink(event.url)}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ background: 'var(--ui-accent)' }}
          >
            Connpassで開く
          </button>
        </div>
      </section>

      {loading && (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-md text-xs"
          style={{ background: 'var(--ui-surface)', color: 'var(--ui-text-secondary)' }}
        >
          <div className="flex h-5 w-5 items-center justify-center shrink-0">
            <div className="connpass-spinner" />
          </div>
          <span>詳細を読み込み中...</span>
        </div>
      )}

      {event.summary && (
        <section
          className="rounded-[20px] p-4"
          style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}
        >
          <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--ui-text)' }}>
            イベント詳細
          </div>
          <SummaryRenderer summary={event.summary} onOpenLink={onOpenLink} />
        </section>
      )}

      {event.presentations && event.presentations.length > 0 && (
        <section
          className="flex flex-col gap-2 rounded-[20px] p-4"
          style={{ background: 'var(--ui-surface)', border: '1px solid var(--ui-border)' }}
        >
          <h3 className="text-sm font-medium" style={{ color: 'var(--ui-text)' }}>
            発表一覧
          </h3>
          {event.presentations.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-xl text-xs"
              style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-border)' }}
            >
              <div className="text-sm font-medium" style={{ color: 'var(--ui-text)' }}>{p.title}</div>
              <div className="mt-1" style={{ color: 'var(--ui-text-secondary)' }}>{p.speaker}</div>
              {p.summary && (
                <div className="mt-2 leading-relaxed" style={{ color: 'var(--ui-text-secondary)' }}>
                  {p.summary}
                </div>
              )}
              {p.links?.url && (
                <button
                  onClick={() => onOpenLink(p.links!.url!)}
                  className="mt-2 text-xs underline"
                  style={{ color: 'var(--ui-accent)' }}
                >
                  スライドを見る
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {!loading && (
        <button
          onClick={() => onOpenLink(event.url)}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: 'var(--ui-accent)' }}
        >
          Connpassで開く
        </button>
      )}
    </div>
  )
}
