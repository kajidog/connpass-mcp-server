import { IGroupRepository } from '../../domain/repositories';
import { GroupSearchParams, GroupsResponse } from '../../domain/entities';
import { HttpClient } from '../http/HttpClient';
import { Validators } from '../../domain/utils/validators';

export class GroupRepository implements IGroupRepository {
  constructor(private httpClient: HttpClient) {}

  async searchGroups(params: GroupSearchParams): Promise<GroupsResponse> {
    Validators.validateGroupSearchParams(params);
    const queryParams = this.buildGroupQueryParams(params);
    const response = await this.httpClient.get<any>('/groups/', queryParams);
    return this.mapGroupsResponse(response.data);
  }

  private buildGroupQueryParams(params: GroupSearchParams): Record<string, any> {
    const queryParams: Record<string, any> = {};

    if (params.groupId) queryParams.group_id = params.groupId.join(',');
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.countryCode) queryParams.country_code = params.countryCode;
    if (params.prefecture) queryParams.prefecture = params.prefecture;
    if (params.count) queryParams.count = params.count;
    if (params.order) queryParams.order = params.order;
    if (params.start) queryParams.start = params.start;

    return queryParams;
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
}
