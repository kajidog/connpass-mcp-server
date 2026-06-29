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

// connpass API v2 has no native date-range parameter. A range must be expanded
// into repeated `ymd` (per-day) or `ym` (per-month) values. The upstream gateway
// returns HTTP 502 once a request carries more than ~200 `ymd` values, so ranges
// wider than this many days fall back to month granularity to keep the query small.
const MAX_YMD_RANGE_DAYS = 62;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse a `YYYY-MM-DD` (or `YYYYMMDD`) string into a timezone-stable local Date. */
function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-?(\d{2})-?(\d{2})$/.exec(value);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? undefined : fallback;
  }
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

function toCompactYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function toCompactYm(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

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

    // Multi-value params must be sent as repeated query params (handled by the
    // HttpClient's `arrayFormat: "repeat"` serializer), not comma-joined —
    // connpass only honors the last value of a comma-joined `ymd`.
    const ymdValues: string[] = params.ymd ? [...params.ymd] : [];

    // Expand the requested date range. `ymd_from`/`ymd_to` are not understood by
    // the v2 API, so we translate the range into `ymd`/`ym` ourselves.
    const from = params.ymdFrom ? parseLocalDate(params.ymdFrom) : undefined;
    const to = params.ymdTo ? parseLocalDate(params.ymdTo) : undefined;
    if (from) {
      const end = to ?? from;
      const dayCount =
        Math.floor((end.getTime() - from.getTime()) / MS_PER_DAY) + 1;

      if (dayCount > 0 && dayCount <= MAX_YMD_RANGE_DAYS) {
        // Short range: precise per-day filtering.
        const cur = new Date(from);
        while (cur <= end) {
          ymdValues.push(toCompactYmd(cur));
          cur.setDate(cur.getDate() + 1);
        }
      } else if (dayCount > 0) {
        // Wide range: fall back to per-month granularity to avoid the 502 limit.
        const months: string[] = [];
        const cur = new Date(from.getFullYear(), from.getMonth(), 1);
        const last = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= last) {
          months.push(toCompactYm(cur));
          cur.setMonth(cur.getMonth() + 1);
        }
        if (months.length) queryParams.ym = months;
      }
    }

    if (ymdValues.length) queryParams.ymd = ymdValues;
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
