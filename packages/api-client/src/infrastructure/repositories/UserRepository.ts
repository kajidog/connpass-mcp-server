import {
  EventsResponse,
  GroupsResponse,
  UserSearchParams,
  UsersResponse,
} from "../../domain/entities";
import { IUserRepository } from "../../domain/repositories";
import { Validators } from "../../domain/utils/validators";
import { HttpClient } from "../http/HttpClient";
import {
  ApiEventsResponse,
  ApiGroupsResponse,
  ApiUsersResponse,
  QueryParams,
  getResponseMeta,
  mapApiEvent,
  mapApiGroup,
  mapApiUser,
} from "./apiTypes";

export class UserRepository implements IUserRepository {
  constructor(private httpClient: HttpClient) {}

  async searchUsers(params: UserSearchParams): Promise<UsersResponse> {
    Validators.validateUserSearchParams(params);
    const queryParams = this.buildUserQueryParams(params);
    const response = await this.httpClient.get<ApiUsersResponse>(
      "/users/",
      queryParams,
    );
    return this.mapUsersResponse(response.data);
  }

  async getUserGroups(
    nickname: string,
    params?: { count?: number; start?: number },
  ): Promise<GroupsResponse> {
    Validators.validateNickname(nickname, "nickname");
    const queryParams: QueryParams = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<ApiGroupsResponse>(
      `/users/${encodedNickname}/groups/`,
      queryParams,
    );
    return this.mapGroupsResponse(response.data);
  }

  async getUserAttendedEvents(
    nickname: string,
    params?: { count?: number; order?: 1 | 2 | 3; start?: number },
  ): Promise<EventsResponse> {
    Validators.validateNickname(nickname, "nickname");
    const queryParams: QueryParams = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.order) queryParams.order = params.order;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<ApiEventsResponse>(
      `/users/${encodedNickname}/attended_events/`,
      queryParams,
    );
    return this.mapEventsResponse(response.data);
  }

  async getUserPresenterEvents(
    nickname: string,
    params?: { count?: number; order?: 1 | 2 | 3; start?: number },
  ): Promise<EventsResponse> {
    Validators.validateNickname(nickname, "nickname");
    const queryParams: QueryParams = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.order) queryParams.order = params.order;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<ApiEventsResponse>(
      `/users/${encodedNickname}/presenter_events/`,
      queryParams,
    );
    return this.mapEventsResponse(response.data);
  }

  private buildUserQueryParams(params: UserSearchParams): QueryParams {
    const queryParams: QueryParams = {};

    if (params.userId) queryParams.user_id = params.userId.join(",");
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.count) queryParams.count = params.count;
    if (params.order) queryParams.order = params.order;
    if (params.start) queryParams.start = params.start;

    return queryParams;
  }

  private mapUsersResponse(data: ApiUsersResponse): UsersResponse {
    const usersArray = data.users ?? data.user ?? [];
    const users = usersArray.map(mapApiUser);
    const meta = getResponseMeta(data, users.length, "users");

    return {
      usersReturned: meta.usersReturned,
      usersAvailable: meta.usersAvailable,
      usersStart: meta.usersStart,
      users,
    };
  }

  private mapGroupsResponse(data: ApiGroupsResponse): GroupsResponse {
    const groupsArray = data.groups ?? data.group ?? [];
    const groups = groupsArray.map(mapApiGroup);
    const meta = getResponseMeta(data, groups.length, "groups");

    return {
      groupsReturned: meta.groupsReturned,
      groupsAvailable: meta.groupsAvailable,
      groupsStart: meta.groupsStart,
      groups,
    };
  }

  private mapEventsResponse(data: ApiEventsResponse): EventsResponse {
    const eventsArray = data.events ?? data.event ?? [];
    const events = eventsArray.map(mapApiEvent);
    const meta = getResponseMeta(data, events.length, "events");

    return {
      eventsReturned: meta.eventsReturned,
      eventsAvailable: meta.eventsAvailable,
      eventsStart: meta.eventsStart,
      events,
    };
  }
}
