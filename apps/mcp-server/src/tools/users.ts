import { z } from "zod";
import { withErrorHandling } from "./utils/errorHandler.js";
import {
  FORMAT_PRESETS,
  formatEventsResponse,
  summarizeEventsResponse,
  summarizeGroupsResponse,
  summarizeUsersResponse,
} from "./utils/formatting.js";
import { registerAppToolIfEnabled } from "./utils/registration.js";
import {
  EVENT_SORT_KEYS,
  EVENT_SORT_MAP,
  USER_SORT_KEYS,
  USER_SORT_MAP,
  applyPagination,
} from "./utils/shared.js";
import { type ToolDeps, paginationSchema } from "./utils/types.js";

const UserSearchInputSchema = z.object({
  nickname: z
    .string()
    .min(1)
    .describe("Match users by nickname (substring search)")
    .optional(),
  userIds: z
    .array(z.number())
    .describe("Limit to specific user IDs")
    .optional(),
  ...paginationSchema,
  sort: z
    .enum(USER_SORT_KEYS)
    .describe("Ranking by activity, followers, or recency")
    .optional(),
});

// connpass resolves users by nickname, not numeric ID — nickname is the
// reliable identifier. A bare userId only resolves if its nickname was looked
// up earlier in the session, so it is accepted but discouraged.
const nicknameField = z
  .string()
  .min(1)
  .describe(
    "Connpass nickname (recommended — the API resolves users by nickname, not numeric ID)",
  )
  .optional();

const userIdField = z
  .number()
  .int()
  .positive()
  .describe(
    "Connpass user ID (prefer nickname; a numeric ID only resolves if its nickname was looked up earlier)",
  )
  .optional();

const requireUserRef = (value: {
  userId?: number;
  nickname?: string;
}): boolean => value.userId !== undefined || value.nickname !== undefined;

const requireUserRefMessage = {
  message: "Provide a nickname (recommended) or userId",
};

const UserGroupsInputSchema = z
  .object({
    userId: userIdField,
    nickname: nicknameField,
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("How many to return (default 20)")
      .optional(),
    page: z.number().int().min(1).describe("1-based page number").optional(),
  })
  .refine(requireUserRef, requireUserRefMessage);

const UserRelationshipInputSchema = z
  .object({
    userId: userIdField,
    nickname: nicknameField,
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("How many to return (default 20)")
      .optional(),
    page: z.number().int().min(1).describe("1-based page number").optional(),
    sort: z
      .enum(EVENT_SORT_KEYS)
      .describe("Sort events by schedule or recency")
      .optional(),
    includeDetails: z
      .boolean()
      .describe(
        "Include event description (up to 200 chars). Use when you need content details for recommendations.",
      )
      .default(false)
      .optional(),
  })
  .refine(requireUserRef, requireUserRefMessage);

type UserRelationshipInput = z.infer<typeof UserRelationshipInputSchema>;

function buildUserRelationshipParams(input: UserRelationshipInput) {
  const pagination = applyPagination(input.page, input.limit, {
    includePagination: true,
  });
  return {
    pagination,
    order: input.sort ? EVENT_SORT_MAP[input.sort] : undefined,
  };
}

export function registerUserTools(deps: ToolDeps): void {
  const { server, connpassClient } = deps;

  registerAppToolIfEnabled(
    server,
    "search_users",
    {
      title: "Search Users",
      description: "Discover Connpass users",
      inputSchema: UserSearchInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const params = UserSearchInputSchema.parse(args ?? {});
      const pagination = applyPagination(params.page, params.pageSize);
      const response = await connpassClient.searchUsers({
        nickname: params.nickname,
        userId: params.userIds,
        order: params.sort ? USER_SORT_MAP[params.sort] : undefined,
        ...pagination,
      });
      return {
        content: [
          { type: "text" as const, text: summarizeUsersResponse(response) },
        ],
      };
    }),
  );

  registerAppToolIfEnabled(
    server,
    "get_user_groups",
    {
      title: "Get User Groups",
      description: "List the groups a user belongs to",
      inputSchema: UserGroupsInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const { userId, nickname, limit, page } = UserGroupsInputSchema.parse(
        args ?? {},
      );
      const pagination = applyPagination(page, limit);
      const response = await connpassClient.getUserGroups(
        (nickname ?? userId) as string | number,
        pagination,
      );
      return {
        content: [
          { type: "text" as const, text: summarizeGroupsResponse(response) },
        ],
      };
    }),
  );

  registerAppToolIfEnabled(
    server,
    "get_user_attended_events",
    {
      title: "Get User Attended Events",
      description: "List events that a user has attended",
      inputSchema: UserRelationshipInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const parsed = UserRelationshipInputSchema.parse(args ?? {});
      const { pagination, order } = buildUserRelationshipParams(parsed);
      const response = await connpassClient.getUserAttendedEvents(
        (parsed.nickname ?? parsed.userId) as string | number,
        { ...pagination, order },
      );
      const formatOptions = parsed.includeDetails
        ? FORMAT_PRESETS.detailed
        : FORMAT_PRESETS.default;
      const formatted = formatEventsResponse(response, formatOptions);
      return {
        content: [
          {
            type: "text" as const,
            text: summarizeEventsResponse(formatted, "attended events"),
          },
        ],
      };
    }),
  );

  registerAppToolIfEnabled(
    server,
    "get_user_presenter_events",
    {
      title: "Get User Presenter Events",
      description: "List events where the user presented",
      inputSchema: UserRelationshipInputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    withErrorHandling(async (args: Record<string, unknown>) => {
      const parsed = UserRelationshipInputSchema.parse(args ?? {});
      const { pagination, order } = buildUserRelationshipParams(parsed);
      const response = await connpassClient.getUserPresenterEvents(
        (parsed.nickname ?? parsed.userId) as string | number,
        { ...pagination, order },
      );
      const formatOptions = parsed.includeDetails
        ? FORMAT_PRESETS.detailed
        : FORMAT_PRESETS.default;
      const formatted = formatEventsResponse(response, formatOptions);
      return {
        content: [
          {
            type: "text" as const,
            text: summarizeEventsResponse(formatted, "presenter events"),
          },
        ],
      };
    }),
  );
}
