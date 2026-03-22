import { useCallback, useEffect, useRef, useState } from 'react'
import type { App as McpApp } from '@modelcontextprotocol/ext-apps'
import type { AppState, EventSearchResult, FormattedEvent, PrefectureOption, ScheduleResult, SearchFormValues } from '../types'
import { extractEventDetailData, extractEventSearchData, extractPrefectureListData, extractScheduleData, extractToolErrorMessage } from '../utils'
import { createConnpassToolClient, type SearchEventsParams, type SearchScheduleParams } from './connpassToolClient'

const DEFAULT_PAGE_SIZE = 5
const PAGE_SIZE_OPTIONS = [5, 10, 20]

function snapPageSize(count: number): number {
  for (const option of PAGE_SIZE_OPTIONS) {
    if (count <= option) return option
  }
  return PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createDefaultSearchFormValues(): SearchFormValues {
  const today = formatDateInput(new Date())
  return {
    query: '',
    anyQuery: '',
    from: today,
    to: today,
    datePreset: 'today',
    prefecture: '',
    company: '',
    minParticipants: '',
    minCapacity: '',
    sort: 'start-date-asc',
    showAdvanced: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  }
}

function inferDatePreset(from: string, to: string): SearchFormValues['datePreset'] {
  const entries: Array<Exclude<SearchFormValues['datePreset'], 'custom'>> = ['today', 'tomorrow', 'this-week', 'this-month']
  for (const preset of entries) {
    const expected = (() => {
      const now = new Date()
      const start = new Date(now)
      const end = new Date(now)
      if (preset === 'tomorrow') {
        start.setDate(start.getDate() + 1)
        end.setDate(end.getDate() + 1)
      } else if (preset === 'this-week') {
        const day = start.getDay()
        const diffToMonday = day === 0 ? -6 : 1 - day
        start.setDate(start.getDate() + diffToMonday)
        end.setDate(start.getDate() + 6)
      } else if (preset === 'this-month') {
        start.setDate(1)
        end.setMonth(end.getMonth() + 1, 0)
      }
      return { from: formatDateInput(start), to: formatDateInput(end) }
    })()
    if (from === expected.from && to === expected.to) {
      return preset
    }
  }
  return 'custom'
}

const defaultSearchFormValues: SearchFormValues = createDefaultSearchFormValues()

const initialState: AppState = {
  viewMode: 'search',
  searchResult: null,
  scheduleResult: null,
  selectedEvent: null,
  searchFormValues: defaultSearchFormValues,
  scheduleNickname: '',
  hasSearched: false,
  loading: false,
  detailLoading: false,
  error: null,
}

function normalizeSearchFormValues(params?: Record<string, unknown>): SearchFormValues {
  const defaultValues = createDefaultSearchFormValues()
  if (!params) return defaultValues

  const prefectures = params.prefectures
  const prefecture =
    typeof prefectures === 'string'
      ? prefectures
      : Array.isArray(prefectures) && typeof prefectures[0] === 'string'
        ? prefectures[0]
        : ''

  return {
    query: typeof params.query === 'string' ? params.query : '',
    anyQuery: typeof params.anyQuery === 'string' ? params.anyQuery : '',
    from: typeof params.from === 'string' ? params.from : defaultValues.from,
    to: typeof params.to === 'string' ? params.to : defaultValues.to,
    datePreset: inferDatePreset(
      typeof params.from === 'string' ? params.from : defaultValues.from,
      typeof params.to === 'string' ? params.to : defaultValues.to,
    ),
    prefecture,
    company: typeof params.companyQuery === 'string' ? params.companyQuery : '',
    minParticipants: typeof params.minAccepted === 'number' ? String(params.minAccepted) : '',
    minCapacity: typeof params.minCapacity === 'number' ? String(params.minCapacity) : '',
    sort:
      params.sort === 'participant-count-desc' || params.sort === 'title-asc' || params.sort === 'start-date-asc'
        ? params.sort
        : 'start-date-asc',
    showAdvanced:
      params.showAdvanced === true ||
      typeof params.companyQuery === 'string' ||
      typeof params.minAccepted === 'number' ||
      typeof params.minCapacity === 'number' ||
      params.sort === 'participant-count-desc' ||
      params.sort === 'title-asc',
    page: typeof params.page === 'number' && params.page > 0 ? params.page : 1,
    pageSize: typeof params.pageSize === 'number' && params.pageSize > 0 ? params.pageSize : DEFAULT_PAGE_SIZE,
  }
}

export function useConnpassApp() {
  const [state, setState] = useState<AppState>(initialState)
  const [prefectures, setPrefectures] = useState<PrefectureOption[]>([])
  const [displayMode, setDisplayMode] = useState<'inline' | 'fullscreen' | 'pip'>('inline')
  const [availableDisplayModes, setAvailableDisplayModes] = useState<string[]>(['inline'])
  const appRef = useRef<McpApp | null>(null)
  const toolClientRef = useRef<ReturnType<typeof createConnpassToolClient> | null>(null)

  useEffect(() => {
    let mounted = true
    let instance: McpApp | null = null

    async function init() {
      try {
        const { App } = await import('@modelcontextprotocol/ext-apps')
        const app = new App(
          {
            name: 'connpass-events',
            version: '1.0.0',
          },
          {
            availableDisplayModes: ['inline', 'fullscreen'],
          },
        )

        app.ontoolinput = (input) => {
          if (!mounted) return

          // ontoolinput params only has { arguments }, no toolName.
          // Get tool name from hostContext.toolInfo instead.
          const hostContext = app.getHostContext?.()
          const toolName = hostContext?.toolInfo?.tool?.name ?? ''
          const isEventTool = toolName === 'search_events' || toolName === 'browse_events' || toolName === '_search_events' || toolName === ''
          if (isEventTool) {
            const formValues = normalizeSearchFormValues((input?.arguments ?? {}) as Record<string, unknown>)
            setState((prev) => ({
              ...prev,
              searchFormValues: formValues,
            }))
          }

          const isScheduleTool = toolName === 'search_schedule' || toolName === '_search_schedule'
          if (isScheduleTool) {
            const args = (input?.arguments ?? {}) as Record<string, unknown>
            const nickname = typeof args.nickname === 'string' ? args.nickname : ''
            setState((prev) => ({
              ...prev,
              scheduleNickname: nickname,
            }))
          }
        }

        app.onhostcontextchanged = (context) => {
          if (!mounted) return
          if (typeof context?.displayMode === 'string') {
            setDisplayMode(context.displayMode)
          }
          if (Array.isArray(context?.availableDisplayModes)) {
            setAvailableDisplayModes(context.availableDisplayModes)
          }
        }

        app.ontoolresult = (result) => {
          if (!mounted) return

          const toolName = result?.toolName ?? result?._meta?.toolName ?? ''

          // イベント検索結果
          if (toolName === 'search_events' || toolName === 'browse_events' || toolName === '_search_events') {
            const data = extractEventSearchData(result)
            if (data) {
              setState((prev) => ({
              ...prev,
              viewMode: 'search',
              searchResult: data,
              selectedEvent: null,
              hasSearched: true,
              loading: false,
              detailLoading: false,
              error: null,
              searchFormValues: {
                ...prev.searchFormValues,
                pageSize: data.returned > 0 ? snapPageSize(data.returned) : prev.searchFormValues.pageSize,
              },
              }))
              return
            }
          }

          if (toolName === '_get_event_detail') {
            const data = extractEventDetailData(result)
            if (data) {
              setState((prev) => ({
                ...prev,
                selectedEvent: data,
                detailLoading: false,
                error: null,
              }))
              return
            }
          }

          // スケジュール結果
          if (toolName === 'search_schedule' || toolName === '_search_schedule') {
            const data = extractScheduleData(result)
            if (data) {
              setState((prev) => ({
                ...prev,
                viewMode: 'schedule',
                scheduleResult: data,
                hasSearched: true,
                loading: false,
                detailLoading: false,
                error: null,
              }))
              return
            }
          }

          // その他のツール結果もイベント検索として試行
          const evData = extractEventSearchData(result)
          if (evData) {
            setState((prev) => ({
              ...prev,
              viewMode: 'search',
              searchResult: evData,
              hasSearched: true,
              loading: false,
              detailLoading: false,
              error: null,
              searchFormValues: {
                ...prev.searchFormValues,
                pageSize: evData.returned > 0 ? snapPageSize(evData.returned) : prev.searchFormValues.pageSize,
              },
            }))
            return
          }

          const schData = extractScheduleData(result)
          if (schData) {
            setState((prev) => ({
              ...prev,
              viewMode: 'schedule',
              scheduleResult: schData,
              hasSearched: true,
              loading: false,
              detailLoading: false,
              error: null,
            }))
          }
        }

        app.onerror = console.error
        instance = app
        await app.connect()

        if (!mounted) {
          app.close?.()
          return
        }

        appRef.current = app
        toolClientRef.current = createConnpassToolClient(app)
        const prefectureResult = await toolClientRef.current.getPrefectures()
        const prefectureData = extractPrefectureListData(prefectureResult)
        if (mounted && prefectureData) {
          setPrefectures(prefectureData)
        }
        const hostContext = app.getHostContext?.()
        if (typeof hostContext?.displayMode === 'string') {
          setDisplayMode(hostContext.displayMode)
        }
        if (Array.isArray(hostContext?.availableDisplayModes)) {
          setAvailableDisplayModes(hostContext.availableDisplayModes)
        }
      } catch (e) {
        console.error('Failed to initialize MCP App:', e)
      }
    }

    init()

    return () => {
      mounted = false
      if (instance?.close) {
        instance.close().catch?.(() => {})
      }
    }
  }, [])

  const searchEvents = useCallback(async (params: SearchEventsParams) => {
    if (!toolClientRef.current) return
    const normalizedParams = {
      ...params,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
    }

    setState((prev) => ({
      ...prev,
      viewMode: 'search',
      hasSearched: true,
      loading: true,
      error: null,
      searchFormValues: {
        query: normalizedParams.query ?? '',
        anyQuery: normalizedParams.anyQuery ?? '',
        from: normalizedParams.from ?? '',
        to: normalizedParams.to ?? '',
        datePreset: (normalizedParams.datePreset as SearchFormValues['datePreset']) ?? prev.searchFormValues.datePreset,
        prefecture:
          typeof normalizedParams.prefectures === 'string'
            ? normalizedParams.prefectures
            : Array.isArray(normalizedParams.prefectures) && typeof normalizedParams.prefectures[0] === 'string'
              ? normalizedParams.prefectures[0]
              : '',
        company: normalizedParams.companyQuery ?? '',
        minParticipants: typeof normalizedParams.minAccepted === 'number' ? String(normalizedParams.minAccepted) : '',
        minCapacity: typeof normalizedParams.minCapacity === 'number' ? String(normalizedParams.minCapacity) : '',
        sort: normalizedParams.sort ?? prev.searchFormValues.sort,
        showAdvanced:
          prev.searchFormValues.showAdvanced ||
          Boolean(normalizedParams.companyQuery) ||
          typeof normalizedParams.minAccepted === 'number' ||
          typeof normalizedParams.minCapacity === 'number' ||
          normalizedParams.sort === 'participant-count-desc' ||
          normalizedParams.sort === 'title-asc',
        page: normalizedParams.page,
        pageSize: normalizedParams.pageSize,
      },
    }))
    try {
      const result = await toolClientRef.current.searchEvents(normalizedParams)
      const data = extractEventSearchData(result)
      setState((prev) => ({
        ...prev,
        searchResult: data ?? prev.searchResult,
        loading: false,
        error: result.isError ? extractToolErrorMessage(result) ?? 'Search failed' : null,
      }))
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : 'Search failed',
      }))
    }
  }, [])

  const searchSchedule = useCallback(async (params: SearchScheduleParams) => {
    if (!toolClientRef.current) return
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const result = await toolClientRef.current.searchSchedule(params)
      const data = extractScheduleData(result)
      setState((prev) => ({
        ...prev,
        scheduleResult: data ?? prev.scheduleResult,
        loading: false,
        error: result.isError ? extractToolErrorMessage(result) ?? 'Search failed' : null,
      }))
    } catch (e) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e instanceof Error ? e.message : 'Search failed',
      }))
    }
  }, [])

  const selectEvent = useCallback(async (event: FormattedEvent) => {
    setState((prev) => ({
      ...prev,
      viewMode: 'detail',
      selectedEvent: event,
      detailLoading: true,
      error: null,
    }))

    if (!toolClientRef.current) {
      setState((prev) => ({ ...prev, detailLoading: false }))
      return
    }

    try {
      const result = await toolClientRef.current.getEventDetail(event.id)
      const detail = extractEventDetailData(result)
      setState((prev) => ({
        ...prev,
        selectedEvent: detail ?? prev.selectedEvent,
        detailLoading: false,
        error: result.isError ? extractToolErrorMessage(result) ?? 'Failed to load event detail' : null,
      }))
    } catch (e) {
      setState((prev) => ({
        ...prev,
        detailLoading: false,
        error: e instanceof Error ? e.message : 'Failed to load event detail',
      }))
    }
  }, [])

  const goBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      viewMode: prev.scheduleResult ? 'schedule' : 'search',
      selectedEvent: null,
      detailLoading: false,
    }))
  }, [])

  const openLink = useCallback((url: string) => {
    if (appRef.current?.openLink) {
      appRef.current.openLink({ url })
    } else {
      window.open(url, '_blank')
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!appRef.current?.requestDisplayMode) return
    const nextMode = displayMode === 'fullscreen' ? 'inline' : 'fullscreen'
    try {
      await appRef.current.requestDisplayMode({ mode: nextMode })
    } catch (e) {
      console.error('Failed to toggle display mode:', e)
    }
  }, [displayMode])

  return {
    state,
    prefectures,
    searchEvents,
    searchSchedule,
    selectEvent,
    goBack,
    openLink,
    toggleFullscreen,
    displayMode,
    fullscreenAvailable: availableDisplayModes.includes('fullscreen'),
  }
}
