import { z } from 'zod'
import type { ToolDeps } from './utils/types.js'
import { registerAppToolIfEnabled } from './utils/registration.js'
import { resolvePrefectureInputs } from './prefectures.js'
import { connpassResourceUri } from './utils/resource.js'
import {
  type FormatEventOptions,
  FORMAT_PRESETS,
  formatEvent,
  formatEventsResponse,
  formatPresentationsResponse,
  summarizeEventsResponse,
} from './utils/formatting.js'
import {
  EVENT_SORT_KEYS,
  EVENT_SORT_MAP,
  applyPagination,
  normalizeKeywordOr,
  normalizeStringArray,
  parseHyphenatedDate,
  toYmdArray,
} from './utils/shared.js'

const EventSearchInputSchema = z.object({
  anyQuery: z.string().min(1).describe('Search keywords (comma-separated, matches ANY keyword)').optional(),
  on: z.union([z.string().min(1), z.array(z.string().min(1))]).describe('Specific date(s) in YYYY-MM-DD or YYYYMMDD format').optional(),
  from: z.string().min(1).describe('Start of date range (inclusive). Format: YYYY-MM-DD').optional(),
  to: z.string().min(1).describe('End of date range (inclusive). Format: YYYY-MM-DD').optional(),
  participantNickname: z.string().min(1).describe('Filter by participant nickname').optional(),
  hostNickname: z.string().min(1).describe('Filter by host/owner nickname').optional(),
  groupIds: z.array(z.number()).describe('Limit results to specific group IDs').optional(),
  prefectures: z.union([z.string().min(1), z.array(z.string().min(1))]).describe('Prefecture name(s) to filter by').optional(),
  page: z.number().int().min(1).describe('1-based page number').optional(),
  pageSize: z.number().int().min(1).max(100).describe('Events per page (default 20, max 100)').optional(),
  sort: z.enum(EVENT_SORT_KEYS).describe('Sort order').optional(),
  includeDetails: z.boolean().describe('Include event description (up to 200 chars). Use when you need content details for recommendations.').default(false).optional(),
})

type EventSearchInput = z.infer<typeof EventSearchInputSchema>

const EventPresentationsInputSchema = z.object({
  eventId: z.union([z.number().int().positive(), z.string().min(1)])
    .describe('Connpass event ID')
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value), 'eventId must be a number'),
})

function buildEventSearchParams(input: EventSearchInput) {
  const pagination = applyPagination(input.page, input.pageSize)
  const resolved = resolvePrefectureInputs(input.prefectures)
  if ('response' in resolved) {
    return resolved
  }

  return {
    keywordOr: normalizeKeywordOr(input.anyQuery),
    ymd: toYmdArray(input.on),
    ymdFrom: input.from ? parseHyphenatedDate(input.from) : undefined,
    ymdTo: input.to ? parseHyphenatedDate(input.to) : undefined,
    nickname: input.participantNickname,
    ownerNickname: input.hostNickname,
    groupId: input.groupIds,
    prefecture: resolved.prefectures ?? normalizeStringArray(input.prefectures),
    order: input.sort ? EVENT_SORT_MAP[input.sort] : undefined,
    ...pagination,
  }
}

const LIST_FORMAT_OPTIONS: FormatEventOptions = {
  descriptionLimit: 0,
  catchPhraseLimit: 100,
}

export function registerEventTools(deps: ToolDeps): void {
  const { server, connpassClient } = deps

  const searchEventsHandler = async (args: Record<string, unknown>) => {
    const params = EventSearchInputSchema.parse(args ?? {})
    const searchParams = buildEventSearchParams(params)
    if ('response' in searchParams) {
      return {
        ...searchParams.response,
        isError: true,
      }
    }
    const response = await connpassClient.searchEvents(searchParams)
    const formatOptions = params.includeDetails ? FORMAT_PRESETS.detailed : FORMAT_PRESETS.default
    const formatted = formatEventsResponse(response, formatOptions)
    return {
      content: [{ type: 'text' as const, text: summarizeEventsResponse(formatted) }],
      structuredContent: {
        kind: 'events',
        data: formatted,
      },
    }
  }

  const browseEventsHandler = async (args: Record<string, unknown>) => {
    const params = EventSearchInputSchema.parse(args ?? {})
    const searchParams = buildEventSearchParams(params)
    if ('response' in searchParams) {
      return {
        ...searchParams.response,
        isError: true,
      }
    }
    const response = await connpassClient.searchEvents(searchParams)
    const formatted = formatEventsResponse(response, LIST_FORMAT_OPTIONS)
    return {
      content: [{ type: 'text' as const, text: summarizeEventsResponse(formatted) }],
      structuredContent: {
        kind: 'events',
        data: formatted,
      },
    }
  }

  // search_events - 公開ツール（UI なし、モデル向け）
  registerAppToolIfEnabled(server, 'search_events', {
    title: 'Search Events',
    description: 'Search Connpass events and return results as text. Use this for answering questions, recommending events, or when the user needs event information in the conversation.',
    inputSchema: EventSearchInputSchema,
  }, searchEventsHandler)

  // browse_events - 公開ツール（UI あり、対話ブラウズ向け）
  registerAppToolIfEnabled(server, 'browse_events', {
    title: 'Browse Events',
    description: 'Show search results in the interactive event browser UI. Call this ONCE after using search_events to display the results visually, or when the user explicitly asks to browse events. Do NOT call this multiple times or use it as a substitute for search_events.',
    inputSchema: EventSearchInputSchema,
    _meta: {
      ui: { resourceUri: connpassResourceUri },
    },
  }, browseEventsHandler)

  // get_event_presentations - 公開ツール
  registerAppToolIfEnabled(server, 'get_event_presentations', {
    title: 'Get Event Presentations',
    description: 'Look up presentation details for a specific event',
    inputSchema: EventPresentationsInputSchema,
  }, async (args: Record<string, unknown>) => {
    const { eventId } = EventPresentationsInputSchema.parse(args ?? {})
    const response = await connpassClient.getEventPresentations(eventId)
    const formatted = formatPresentationsResponse(response)
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(formatted) }],
    }
  })

  // get_event_detail - 公開ツール
  registerAppToolIfEnabled(server, 'get_event_detail', {
    title: 'Get Event Detail',
    description: 'Get full details of a specific event by ID, including complete description and presentations',
    inputSchema: EventPresentationsInputSchema,
  }, async (args: Record<string, unknown>) => {
    const { eventId } = EventPresentationsInputSchema.parse(args ?? {})

    const [eventsResponse, presentationsResponse] = await Promise.all([
      connpassClient.searchEvents({ eventId: [eventId], count: 1 }),
      connpassClient.getEventPresentations(eventId).catch(() => undefined),
    ])

    const event = eventsResponse.events[0]
    if (!event) {
      throw new Error(`Event with ID ${eventId} not found.`)
    }

    const formatted = formatEvent(event, FORMAT_PRESETS.full)
    const presentations = presentationsResponse
      ? formatPresentationsResponse(presentationsResponse)
      : undefined

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ event: formatted, presentations }) }],
    }
  })

}
