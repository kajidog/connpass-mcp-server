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

export interface ConnpassEvent {
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

export interface EventsMetadata {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  inspected?: number;
  includePresentations?: boolean;
}

export interface DateSection {
  date: string;
  events: ConnpassEvent[];
}

export interface SearchToolOutput {
  events: ConnpassEvent[];
  returned: number;
  metadata?: EventsMetadata;
}

export interface AgendaToolOutput {
  userId: number;
  sections: DateSection[];
  metadata?: EventsMetadata;
}

export type ToolOutputData = SearchToolOutput | AgendaToolOutput;

export interface ToolOutput {
  app: string;
  tool: string;
  kind: string;
  generatedAt: string;
  data: ToolOutputData;
}

export interface AgendaSection {
  key: string;
  title: string;
  subtitle: string;
  events: ConnpassEvent[];
  emptyText: string;
}

export type NormalizedVariant = "search" | "agenda";

export interface NormalizedToolOutput {
  variant: NormalizedVariant;
  events: ConnpassEvent[];
  sections: AgendaSection[];
  metadata: EventsMetadata | null;
  userId: number | null;
  returned: number;
}
