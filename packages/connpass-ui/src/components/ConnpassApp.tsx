import { useConnpassApp } from '../hooks/useConnpassApp'
import { EventDetail } from './EventDetail'
import { EventSearch } from './EventSearch'
import { ScheduleView } from './ScheduleView'

export function ConnpassApp() {
  const {
    state,
    prefectures,
    searchEvents,
    searchSchedule,
    selectEvent,
    goBack,
    openLink,
    toggleFullscreen,
    displayMode,
    fullscreenAvailable,
  } = useConnpassApp()

  const content = (() => {
  if (state.viewMode === 'detail' && state.selectedEvent) {
    return (
      <EventDetail
        event={state.selectedEvent}
        loading={state.detailLoading}
        error={state.error}
        onBack={goBack}
        onOpenLink={openLink}
      />
    )
  }

  if (state.viewMode === 'schedule') {
    return (
      <ScheduleView
        result={state.scheduleResult}
        initialNickname={state.scheduleNickname}
        loading={state.loading}
        error={state.error}
        onSearchSchedule={searchSchedule}
        onSelectEvent={selectEvent}
      />
    )
  }

  return (
    <EventSearch
      result={state.searchResult}
      prefectures={prefectures}
      formValues={state.searchFormValues}
      hasSearched={state.hasSearched}
      loading={state.loading}
      error={state.error}
      onSearch={searchEvents}
      onSelectEvent={selectEvent}
    />
  )
  })()

  return (
    <div className="flex flex-col">
      {content}
    </div>
  )
}
