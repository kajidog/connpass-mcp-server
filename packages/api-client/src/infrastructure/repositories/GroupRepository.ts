import { IGroupRepository } from '../../domain/repositories';
import { GroupSearchParams, GroupsResponse } from '../../domain/entities';
import { HttpClient } from '../http/HttpClient';
import { Validators } from '../../domain/utils/validators';
import { ApiGroupsResponse, QueryParams, getResponseMeta, mapApiGroup } from './apiTypes';

export class GroupRepository implements IGroupRepository {
  constructor(private httpClient: HttpClient) {}

  async searchGroups(params: GroupSearchParams): Promise<GroupsResponse> {
    Validators.validateGroupSearchParams(params);
    const queryParams = this.buildGroupQueryParams(params);
    const response = await this.httpClient.get<ApiGroupsResponse>('/groups/', queryParams);
    return this.mapGroupsResponse(response.data);
  }

  private buildGroupQueryParams(params: GroupSearchParams): QueryParams {
    const queryParams: QueryParams = {};

    if (params.groupId) queryParams.group_id = params.groupId.join(',');
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.prefecture) queryParams.prefecture = params.prefecture;
    if (params.count) queryParams.count = params.count;
    if (params.order) queryParams.order = params.order;
    if (params.start) queryParams.start = params.start;

    return queryParams;
  }

  private mapGroupsResponse(data: ApiGroupsResponse): GroupsResponse {
    const groupsArray = data.groups ?? data.group ?? [];
    const groups = groupsArray.map(mapApiGroup);
    const meta = getResponseMeta(data, groups.length, 'groups');

    return {
      groupsReturned: meta.groupsReturned,
      groupsAvailable: meta.groupsAvailable,
      groupsStart: meta.groupsStart,
      groups,
    };
  }
}
