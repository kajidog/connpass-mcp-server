export interface SearchFormValues {
  query: string;
  anyQuery: string;
  from: string;
  to: string;
  datePreset: "today" | "tomorrow" | "this-week" | "this-month" | "custom";
  prefecture: string;
  company: string;
  minParticipants: string;
  minCapacity: string;
  sort: "start-date-asc" | "participant-count-desc" | "title-asc";
  showAdvanced: boolean;
  page: number;
  pageSize: number;
}

export interface PrefectureOption {
  code: string;
  name: string;
}

export interface FormattedEvent {
  id: number;
  title: string;
  catchPhrase?: string;
  summary?: string;
  url: string;
  hashTag?: string;
  imageUrl?: string;
  schedule: {
    start: string;
    end: string;
  };
  location?: {
    place?: string;
    address?: string;
    lat?: number;
    lon?: number;
  };
  owner: {
    nickname: string;
    displayName: string;
  };
  participants: {
    accepted: number;
    waiting: number;
    limit?: number;
  };
  group?: {
    id?: number;
    title?: string;
    url?: string;
  };
  updatedAt: string;
  presentations?: FormattedPresentation[];
}

export interface FormattedPresentation {
  id: number;
  title: string;
  speaker: string;
  summary?: string;
  links?: {
    url?: string;
    slideshare?: string;
    youtube?: string;
    twitter?: string;
  };
  order: number;
  updatedAt: string;
}

export interface DetailFact {
  label: string;
  value: string;
  tone?: "default" | "accent" | "muted";
}

export interface EventSearchResult {
  returned: number;
  available: number;
  start: number;
  events: FormattedEvent[];
}

export interface ScheduleSection {
  date: string;
  events: FormattedEvent[];
}

export interface ScheduleResult {
  userId: number;
  sections: ScheduleSection[];
  metadata: {
    fromDate: string;
    toDate: string;
    inspected: number;
    limit: number;
  };
}

export type ViewMode = "search" | "detail" | "schedule";

export interface AppState {
  viewMode: ViewMode;
  searchResult: EventSearchResult | null;
  scheduleResult: ScheduleResult | null;
  selectedEvent: FormattedEvent | null;
  searchFormValues: SearchFormValues;
  scheduleNickname: string;
  hasSearched: boolean;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
}
