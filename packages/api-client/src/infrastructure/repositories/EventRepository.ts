import {
  Event,
  EventSearchParams,
  EventsResponse,
  PresentationsResponse,
} from "../../domain/entities";
import { IEventRepository } from "../../domain/repositories";
import { Validators } from "../../domain/utils/validators";
import { PresentationCache } from "../cache/PresentationCache";
import { HttpClient } from "../http/HttpClient";
import {
  ApiEventsResponse,
  ApiPresentationsResponse,
  QueryParams,
  getResponseMeta,
  mapApiEvent,
  mapApiPresentation,
} from "./apiTypes";

export class EventRepository implements IEventRepository {
  constructor(
    private httpClient: HttpClient,
    private presentationCache?: PresentationCache,
  ) {}

  async searchEvents(params: EventSearchParams): Promise<EventsResponse> {
    Validators.validateEventSearchParams(params);
    const queryParams = this.buildEventQueryParams(params);
    const response = await this.httpClient.get<ApiEventsResponse>(
      "/events/",
      queryParams,
    );
    return this.mapEventsResponse(response.data);
  }

  async getEventPresentations(eventId: number): Promise<PresentationsResponse> {
    Validators.validatePositiveInteger(eventId, "eventId");
    const cached = await this.presentationCache?.get(eventId);
    if (cached) {
      return cached;
    }

    const response = await this.httpClient.get<ApiPresentationsResponse>(
      `/events/${eventId}/presentations/`,
    );
    const data = this.mapPresentationsResponse(response.data);
    await this.presentationCache?.set(eventId, data);
    return data;
  }

  private buildEventQueryParams(params: EventSearchParams): QueryParams {
    const queryParams: QueryParams = {};

    if (params.eventId) queryParams.event_id = params.eventId;
    if (params.keyword) queryParams.keyword = params.keyword;
    if (params.keywordOr) queryParams.keyword_or = params.keywordOr;
    if (params.ymd) queryParams.ymd = params.ymd.join(",");
    // For v2 compatibility: expand ymdFrom..ymdTo into comma-separated ymd list, while still passing v1 params
    if (params.ymdFrom) queryParams.ymd_from = params.ymdFrom;
    if (params.ymdTo) queryParams.ymd_to = params.ymdTo;
    if (params.ymdFrom || params.ymdTo) {
      const from = params.ymdFrom ? new Date(params.ymdFrom) : undefined;
      const to = params.ymdTo ? new Date(params.ymdTo) : undefined;
      if (from && !Number.isNaN(from.getTime())) {
        const end = to && !Number.isNaN(to.getTime()) ? to : from;
        const list: string[] = [];
        const cur = new Date(from);
        // normalize to local date, increment by 1 day
        // cap at 366 iterations to avoid runaway
        let guard = 0;
        while (cur <= end && guard < 366) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(cur.getDate()).padStart(2, "0");
          list.push(`${y}${m}${d}`);
          cur.setDate(cur.getDate() + 1);
          guard += 1;
        }
        if (list.length) {
          queryParams.ymd = list.join(",");
        }
      }
    }
    if (params.nickname) queryParams.nickname = params.nickname;
    if (params.ownerNickname) queryParams.owner_nickname = params.ownerNickname;
    if (params.groupId) queryParams.group_id = params.groupId;
    if (params.prefecture) queryParams.prefecture = params.prefecture.join(",");
    if (params.count) queryParams.count = params.count;
    if (params.order) queryParams.order = params.order;
    if (params.start) queryParams.start = params.start;

    return queryParams;
  }

  private mapEventsResponse(data: ApiEventsResponse): EventsResponse {
    const eventsArray = data.events ?? data.event ?? [];
    const events: Event[] = eventsArray.map(mapApiEvent);
    const meta = getResponseMeta(data, events.length, "events");

    return {
      eventsReturned: meta.eventsReturned,
      eventsAvailable: meta.eventsAvailable,
      eventsStart: meta.eventsStart,
      events,
    };
  }

  private mapPresentationsResponse(
    data: ApiPresentationsResponse,
  ): PresentationsResponse {
    const presentationsArray = data.presentations ?? [];

    return {
      presentationsReturned:
        data.results?.returned ??
        data.results_returned ??
        data.resultsReturned ??
        data.returned ??
        presentationsArray.length,
      presentations: presentationsArray.map((presentation, index) =>
        mapApiPresentation(presentation, index),
      ),
    };
  }
}
