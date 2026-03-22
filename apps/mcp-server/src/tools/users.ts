import { z } from 'zod'
import type { ToolDeps } from './utils/types.js'
import { registerAppToolIfEnabled } from './utils/registration.js'
import { summarizeEventsResponse, summarizeGroupsResponse, summarizeUsersResponse, formatEventsResponse, FORMAT_PRESETS } from './utils/formatting.js'
import { EVENT_SORT_KEYS, EVENT_SORT_MAP, USER_SORT_KEYS, USER_SORT_MAP, applyPagination } from './utils/shared.js'

const UserSearchInputSchema = z.object({
  nickname: z.string().min(1).describe('Match users by nickname (substring search)').optional(),
  userIds: z.array(z.number()).describe('Limit to specific user IDs').optional(),
  page: z.number().int().min(1).describe('1-based page number').optional(),
  pageSize: z.number().int().min(1).max(100).describe('Users per page (default 20)').optional(),
  sort: z.enum(USER_SORT_KEYS).describe('Ranking by activity, followers, or recency').optional(),
})

const UserGroupsInputSchema = z.object({
  userId: z.number().int().positive().describe('Connpass user ID'),
  limit: z.number().int().min(1).max(100).describe('How many to return (default 20)').optional(),
  page: z.number().int().min(1).describe('1-based page number').optional(),
})

const UserRelationshipInputSchema = z.object({
  userId: z.number().int().positive().describe('Connpass user ID'),
  limit: z.number().int().min(1).max(100).describe('How many to return (default 20)').optional(),
  page: z.number().int().min(1).describe('1-based page number').optional(),
  sort: z.enum(EVENT_SORT_KEYS).describe('Sort events by schedule or recency').optional(),
  includeDetails: z.boolean().describe('Include event description (up to 200 chars). Use when you need content details for recommendations.').default(false).optional(),
})

type UserRelationshipInput = z.infer<typeof UserRelationshipInputSchema>

function buildUserRelationshipParams(input: UserRelationshipInput) {
  const pagination = applyPagination(input.page, input.limit, { includePagination: true })
  return {
    pagination,
    order: input.sort ? EVENT_SORT_MAP[input.sort] : undefined,
  }
}

export function registerUserTools(deps: ToolDeps): void {
  const { server, connpassClient } = deps

  registerAppToolIfEnabled(server, 'search_users', {
    title: 'Search Users',
    description: 'Discover Connpass users',
    inputSchema: UserSearchInputSchema,
  }, async (args: Record<string, unknown>) => {
    const params = UserSearchInputSchema.parse(args ?? {})
    const pagination = applyPagination(params.page, params.pageSize)
    const response = await connpassClient.searchUsers({
      nickname: params.nickname,
      userId: params.userIds,
      order: params.sort ? USER_SORT_MAP[params.sort] : undefined,
      ...pagination,
    })
    return {
      content: [{ type: 'text' as const, text: summarizeUsersResponse(response) }],
    }
  })

  registerAppToolIfEnabled(server, 'get_user_groups', {
    title: 'Get User Groups',
    description: 'List the groups a user belongs to',
    inputSchema: UserGroupsInputSchema,
  }, async (args: Record<string, unknown>) => {
    const { userId, limit, page } = UserGroupsInputSchema.parse(args ?? {})
    const pagination = applyPagination(page, limit)
    const response = await connpassClient.getUserGroups(userId, pagination)
    return {
      content: [{ type: 'text' as const, text: summarizeGroupsResponse(response) }],
    }
  })

  registerAppToolIfEnabled(server, 'get_user_attended_events', {
    title: 'Get User Attended Events',
    description: 'List events that a user has attended',
    inputSchema: UserRelationshipInputSchema,
  }, async (args: Record<string, unknown>) => {
    const parsed = UserRelationshipInputSchema.parse(args ?? {})
    const { pagination, order } = buildUserRelationshipParams(parsed)
    const response = await connpassClient.getUserAttendedEvents(parsed.userId, { ...pagination, order })
    const formatOptions = parsed.includeDetails ? FORMAT_PRESETS.detailed : FORMAT_PRESETS.default
    const formatted = formatEventsResponse(response, formatOptions)
    return {
      content: [{ type: 'text' as const, text: summarizeEventsResponse(formatted, 'attended events') }],
    }
  })

  registerAppToolIfEnabled(server, 'get_user_presenter_events', {
    title: 'Get User Presenter Events',
    description: 'List events where the user presented',
    inputSchema: UserRelationshipInputSchema,
  }, async (args: Record<string, unknown>) => {
    const parsed = UserRelationshipInputSchema.parse(args ?? {})
    const { pagination, order } = buildUserRelationshipParams(parsed)
    const response = await connpassClient.getUserPresenterEvents(parsed.userId, { ...pagination, order })
    const formatOptions = parsed.includeDetails ? FORMAT_PRESETS.detailed : FORMAT_PRESETS.default
    const formatted = formatEventsResponse(response, formatOptions)
    return {
      content: [{ type: 'text' as const, text: summarizeEventsResponse(formatted, 'presenter events') }],
    }
  })
}
