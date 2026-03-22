import type { Event, Group, Presentation, User } from "../../domain/entities";

type QueryParamPrimitive = string | number | boolean;

export type QueryParams = Record<
  string,
  QueryParamPrimitive | QueryParamPrimitive[] | undefined
>;

interface ApiResults {
  returned?: number;
  available?: number;
  start?: number;
}

interface ApiListResponseBase {
  results?: ApiResults;
  results_returned?: number;
  results_available?: number;
  results_start?: number;
  resultsReturned?: number;
  resultsAvailable?: number;
  resultsStart?: number;
  returned?: number;
  available?: number;
  start?: number;
}

export interface ApiGroupSummary {
  id: number;
  title: string;
  url: string;
  subdomain?: string | null;
}

export interface ApiEvent {
  id?: number;
  event_id?: number;
  title: string;
  catch?: string | null;
  catchPhrase?: string | null;
  description?: string | null;
  url?: string;
  event_url?: string;
  image_url?: string | null;
  imageUrl?: string | null;
  hash_tag?: string | null;
  hashTag?: string | null;
  started_at?: string | null;
  startedAt?: string | null;
  ended_at?: string | null;
  endedAt?: string | null;
  limit?: number | null;
  accepted?: number;
  participantCount?: number;
  waiting?: number;
  waitingCount?: number;
  owner_nickname?: string;
  ownerNickname?: string;
  owner_display_name?: string;
  ownerDisplayName?: string;
  place?: string | null;
  address?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  group?: ApiGroupSummary | null;
  series?: ApiGroupSummary | null;
  updated_at?: string;
  updatedAt?: string;
}

export interface ApiGroup {
  id: number;
  title: string;
  description?: string | null;
  url: string;
  country_code?: string | null;
  countryCode?: string | null;
  prefecture?: string | null;
  place?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
}

export interface ApiUser {
  id: number;
  nickname: string;
  display_name?: string;
  displayName?: string;
  twitter_username?: string | null;
  twitterUsername?: string | null;
  github_username?: string | null;
  githubUsername?: string | null;
  url?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  created_at?: string | null;
}

export interface ApiEventsResponse extends ApiListResponseBase {
  events?: ApiEvent[];
  event?: ApiEvent[];
}

export interface ApiGroupsResponse extends ApiListResponseBase {
  groups?: ApiGroup[];
  group?: ApiGroup[];
}

export interface ApiUsersResponse extends ApiListResponseBase {
  users?: ApiUser[];
  user?: ApiUser[];
}

export interface ApiPresentationPerson {
  id?: number;
  nickname?: string | null;
}

export interface ApiPresentation {
  id?: number;
  presentation_id?: number;
  title?: string | null;
  name?: string | null;
  speaker_name?: string | null;
  speakerName?: string | null;
  presenter?: ApiPresentationPerson | null;
  user?: ApiPresentationPerson | null;
  description?: string | null;
  abstract?: string | null;
  url?: string | null;
  slideshare_url?: string | null;
  slideshareUrl?: string | null;
  youtube_url?: string | null;
  youtubeUrl?: string | null;
  twitter_url?: string | null;
  twitterUrl?: string | null;
  order?: number | null;
  presentation_order?: number | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface ApiPresentationsResponse extends ApiListResponseBase {
  presentations?: ApiPresentation[];
}

function parseOptionalNumber(
  value: number | string | null | undefined,
): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function mapApiEvent(event: ApiEvent): Event {
  return {
    id: event.id ?? event.event_id ?? 0,
    title: event.title,
    catchPhrase: event.catch ?? event.catchPhrase ?? "",
    description: event.description ?? "",
    url: event.url ?? event.event_url ?? "",
    imageUrl: event.image_url ?? event.imageUrl ?? undefined,
    hashTag: event.hash_tag ?? event.hashTag ?? "",
    startedAt: event.started_at ?? event.startedAt ?? "",
    endedAt: event.ended_at ?? event.endedAt ?? "",
    limit: event.limit ?? undefined,
    participantCount: event.accepted ?? event.participantCount ?? 0,
    waitingCount: event.waiting ?? event.waitingCount ?? 0,
    ownerNickname: event.owner_nickname ?? event.ownerNickname ?? "",
    ownerDisplayName: event.owner_display_name ?? event.ownerDisplayName ?? "",
    place: event.place ?? undefined,
    address: event.address ?? undefined,
    lat: parseOptionalNumber(event.lat),
    lon: parseOptionalNumber(event.lon),
    groupId: event.group?.id ?? event.series?.id ?? undefined,
    groupTitle: event.group?.title ?? event.series?.title ?? undefined,
    groupUrl: event.group?.url ?? event.series?.url ?? undefined,
    updatedAt: event.updated_at ?? event.updatedAt ?? "",
  };
}

export function mapApiGroup(group: ApiGroup): Group {
  return {
    id: group.id,
    title: group.title,
    description: group.description ?? "",
    url: group.url,
    countryCode: group.country_code ?? group.countryCode ?? "",
    prefecture: group.prefecture ?? "",
    place: group.place ?? "",
    lat: parseOptionalNumber(group.lat),
    lon: parseOptionalNumber(group.lon),
    updatedAt: group.updated_at ?? group.updatedAt ?? "",
  };
}

export function mapApiUser(user: ApiUser): User {
  return {
    id: user.id,
    nickname: user.nickname,
    displayName: user.display_name ?? user.displayName ?? "",
    twitterUsername: user.twitter_username ?? user.twitterUsername ?? undefined,
    githubUsername: user.github_username ?? user.githubUsername ?? undefined,
    url: user.url ?? undefined,
    updatedAt: user.updated_at ?? user.updatedAt ?? user.created_at ?? "",
  };
}

export function mapApiPresentation(
  presentation: ApiPresentation,
  index = 0,
): Presentation {
  const speakerName =
    presentation.speaker_name ??
    presentation.speakerName ??
    presentation.presenter?.nickname ??
    presentation.user?.nickname ??
    "";

  return {
    id: presentation.id ?? presentation.presentation_id ?? index + 1,
    title: presentation.title ?? presentation.name ?? "",
    speakerName,
    description: presentation.description ?? presentation.abstract ?? "",
    url: presentation.url ?? undefined,
    slideshareUrl:
      presentation.slideshare_url ?? presentation.slideshareUrl ?? undefined,
    youtubeUrl:
      presentation.youtube_url ?? presentation.youtubeUrl ?? undefined,
    twitterUrl:
      presentation.twitter_url ?? presentation.twitterUrl ?? undefined,
    order: presentation.order ?? presentation.presentation_order ?? index + 1,
    updatedAt:
      presentation.updated_at ??
      presentation.updatedAt ??
      presentation.created_at ??
      presentation.createdAt ??
      "",
  };
}

export function getResponseMeta(
  data: ApiListResponseBase,
  itemCount: number,
  prefix: "events" | "groups" | "users",
) {
  const capitalizedPrefix = prefix[0].toUpperCase() + prefix.slice(1);
  const returnedKey = `${prefix}Returned` as const;
  const availableKey = `${prefix}Available` as const;
  const startKey = `${prefix}Start` as const;

  return {
    [returnedKey]:
      data.results?.returned ??
      data.results_returned ??
      data.resultsReturned ??
      data.returned ??
      (data as Record<string, number | undefined>)[returnedKey] ??
      itemCount,
    [availableKey]:
      data.results?.available ??
      data.results_available ??
      data.resultsAvailable ??
      data.available ??
      (data as Record<string, number | undefined>)[availableKey] ??
      itemCount,
    [startKey]:
      data.results?.start ??
      data.results_start ??
      data.resultsStart ??
      data.start ??
      (data as Record<string, number | undefined>)[startKey] ??
      1,
    [`${capitalizedPrefix}Count`]: itemCount,
  } as {
    [K in
      | typeof returnedKey
      | typeof availableKey
      | typeof startKey
      | `${Capitalize<typeof prefix>}Count`]: number;
  };
}
