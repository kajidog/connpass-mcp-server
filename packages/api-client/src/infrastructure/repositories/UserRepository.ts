import { IUserRepository } from '../../domain/repositories';
import { UserSearchParams, UsersResponse, GroupsResponse, EventsResponse } from '../../domain/entities';
import { HttpClient } from '../http/HttpClient';
import { Validators } from '../../domain/utils/validators';

export class UserRepository implements IUserRepository {
  constructor(private httpClient: HttpClient) {}

  async searchUsers(params: UserSearchParams): Promise<UsersResponse> {
    Validators.validateUserSearchParams(params);
    const queryParams = this.buildUserQueryParams(params);
    const response = await this.httpClient.get<any>('/users/', queryParams);
    return this.mapUsersResponse(response.data);
  }

  async getUserGroups(nickname: string, params?: { count?: number; start?: number }): Promise<GroupsResponse> {
    Validators.validateNickname(nickname, 'nickname');
    const queryParams: Record<string, any> = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<any>(
      `/users/${encodedNickname}/groups/`,
      queryParams
    );
    return this.mapGroupsResponse(response.data);
  }

  async getUserAttendedEvents(
    nickname: string,
    params?: { count?: number; order?: 1 | 2 | 3; start?: number }
  ): Promise<EventsResponse> {
    Validators.validateNickname(nickname, 'nickname');
    const queryParams: Record<string, any> = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.order) queryParams.order = params.order;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<any>(
      `/users/${encodedNickname}/attended_events/`,
      queryParams
    );
    return this.mapEventsResponse(response.data);
  }

  async getUserPresenterEvents(
    nickname: string,
    params?: { count?: number; order?: 1 | 2 | 3; start?: number }
  ): Promise<EventsResponse> {
    Validators.validateNickname(nickname, 'nickname');
    const queryParams: Record<string, any> = {};
    if (params?.count) queryParams.count = params.count;
    if (params?.order) queryParams.order = params.order;
    if (params?.start) queryParams.start = params.start;

    const encodedNickname = encodeURIComponent(nickname.trim());
    const response = await this.httpClient.get<any>(
      `/users/${encodedNickname}/presenter_events/`,
      queryParams
    );
    return this.mapEventsResponse(response.data);
  }

  private buildUserQueryParams(params: UserSearchParams): Record<string, any> {
    const queryParams: Record<string, any> = {};

    if (params.userId) queryParams.user_id = params.userId.join(',');
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.count) queryParams.count = params.count;
    if (params.order) queryParams.order = params.order;
    if (params.start) queryParams.start = params.start;

    return queryParams;
  }

  private mapUsersResponse(data: any): UsersResponse {
    const usersArray: any[] = data.users ?? data.user ?? [];
    const results = data.results && typeof data.results === 'object' ? data.results : undefined;

    return {
      usersReturned: results?.returned ?? data.results_returned ?? data.resultsReturned ?? data.returned ?? data.usersReturned ?? usersArray.length,
      usersAvailable: results?.available ?? data.results_available ?? data.resultsAvailable ?? data.available ?? data.usersAvailable ?? usersArray.length,
      usersStart: results?.start ?? data.results_start ?? data.resultsStart ?? data.start ?? data.usersStart ?? 1,
      users: usersArray,
    };
  }

  private mapGroupsResponse(data: any): GroupsResponse {
    const groupsArray: any[] = data.groups ?? data.group ?? [];
    const results = data.results && typeof data.results === 'object' ? data.results : undefined;

    return {
      groupsReturned: results?.returned ?? data.results_returned ?? data.resultsReturned ?? data.returned ?? data.groupsReturned ?? groupsArray.length,
      groupsAvailable: results?.available ?? data.results_available ?? data.resultsAvailable ?? data.available ?? data.groupsAvailable ?? groupsArray.length,
      groupsStart: results?.start ?? data.results_start ?? data.resultsStart ?? data.start ?? data.groupsStart ?? 1,
      groups: groupsArray,
    };
  }

  private mapEventsResponse(data: any): EventsResponse {
    const eventsArray: any[] = data.events ?? data.event ?? [];
    const results = data.results && typeof data.results === 'object' ? data.results : undefined;

    return {
      eventsReturned: results?.returned ?? data.results_returned ?? data.resultsReturned ?? data.returned ?? data.eventsReturned ?? eventsArray.length,
      eventsAvailable: results?.available ?? data.results_available ?? data.resultsAvailable ?? data.available ?? data.eventsAvailable ?? eventsArray.length,
      eventsStart: results?.start ?? data.results_start ?? data.resultsStart ?? data.start ?? data.eventsStart ?? 1,
      events: eventsArray,
    };
  }
}
