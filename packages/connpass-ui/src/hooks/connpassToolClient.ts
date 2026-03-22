import type { App } from '@modelcontextprotocol/ext-apps'
import type { FormattedEvent } from '../types'

export interface SearchEventsParams {
  [key: string]: unknown
  query?: string
  anyQuery?: string
  on?: string | string[]
  from?: string
  to?: string
  participantNickname?: string
  hostNickname?: string
  groupIds?: number[]
  prefectures?: string | string[]
  companyQuery?: string
  minAccepted?: number
  maxAccepted?: number
  minCapacity?: number
  maxCapacity?: number
  sort?: 'start-date-asc' | 'participant-count-desc' | 'title-asc'
  datePreset?: string
  showAdvanced?: boolean
  page?: number
  pageSize?: number
}

export interface SearchScheduleParams {
  [key: string]: unknown
  userId?: number
  nickname?: string
  fromDate?: string
  toDate?: string
  maxEvents?: number
}

export interface EventDetailResult {
  event: FormattedEvent
}

/**
 * MCP App からサーバーツールを呼び出すラッパー
 */
export function createConnpassToolClient(app: App) {
  return {
    async searchEvents(params: SearchEventsParams) {
      return app.callServerTool({
        name: '_search_events',
        arguments: params,
      })
    },
    async searchSchedule(params: SearchScheduleParams) {
      return app.callServerTool({
        name: '_search_schedule',
        arguments: params,
      })
    },
    async getPrefectures() {
      return app.callServerTool({
        name: '_get_prefectures',
        arguments: {},
      })
    },
    async getEventDetail(eventId: number) {
      return app.callServerTool({
        name: '_get_event_detail',
        arguments: { eventId },
      })
    },
  }
}
