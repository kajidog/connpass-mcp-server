import type { EventSearchResult, FormattedEvent, PrefectureOption, SearchFormValues } from '../types'
import type { SearchEventsParams } from '../hooks/connpassToolClient'
import { EventCard } from './shared/EventCard'
import { SearchForm } from './shared/SearchForm'
import { Spinner } from './shared/Spinner'

interface EventSearchProps {
  result: EventSearchResult | null
  prefectures: PrefectureOption[]
  formValues: SearchFormValues
  hasSearched: boolean
  loading: boolean
  error: string | null
  onSearch: (params: SearchEventsParams) => void
  onSelectEvent: (event: FormattedEvent) => void
}

export function EventSearch({ result, prefectures, formValues, hasSearched, loading, error, onSearch, onSelectEvent }: EventSearchProps) {
  const pageSize = formValues.pageSize || Math.max(result?.events.length ?? 0, 1)

  return (
    <div className="flex flex-col gap-3 p-2">
      <SearchForm values={formValues} prefectures={prefectures} onSearch={onSearch} loading={loading} />

      {error && (
        <div className="px-3 py-2 rounded-md text-xs text-red-500" style={{ background: 'var(--ui-surface)' }}>
          {error}
        </div>
      )}

      {loading && <Spinner />}

      {result && !loading && (
        <>
          <div className="flex items-center justify-between gap-2 px-1 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
            <span>表示中 {result.events.length}件</span>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto pr-1" style={{ maxHeight: '56vh' }}>
            {result.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={onSelectEvent}
              />
            ))}
          </div>
          {hasSearched && result.events.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
              イベントが見つかりませんでした
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--ui-text-secondary)' }}>
          AIがイベント検索を実行すると、ここに結果が表示されます
        </div>
      )}
    </div>
  )
}
