// Types for Connpass events and MCP structured content

export interface ConnpassEvent {
  id: number;
  title: string;
  catchPhrase?: string;
  summary?: string;
  url: string;
  imageUrl?: string;
  hashTag?: string;
  schedule?: {
    start: string;
    end: string;
  };
  location?: {
    place?: string;
    address?: string;
  };
  participants?: {
    accepted: number;
    limit: number;
    waiting: number;
  };
  owner?: {
    id: number;
    nickname?: string;
    displayName?: string;
    imageUrl?: string;
  };
  group?: {
    id: number;
    title?: string;
    url?: string;
  };
  presentations?: Presentation[];
}

export interface Presentation {
  order?: number;
  title?: string;
  speaker?: string;
  summary?: string;
  links?: Record<string, string>;
}

export interface EventSection {
  key: string;
  title: string;
  subtitle?: string;
  events: ConnpassEvent[];
  emptyText?: string;
}

export interface MCPMetadata {
  daysAhead?: number;
  limit?: number;
  inspected?: number;
  includePresentations?: boolean;
}

export interface SearchData {
  events: ConnpassEvent[];
  returned: number;
  metadata?: MCPMetadata;
  userId?: number;
}

export interface AgendaData {
  today?: {
    date: string;
    events: ConnpassEvent[];
  };
  upcoming?: {
    rangeEnd: string;
    events: ConnpassEvent[];
  };
  metadata?: MCPMetadata;
  userId?: number;
}

export interface MCPStructuredContent {
  app: string;
  tool: string;
  kind: string;
  generatedAt: string;
  data: SearchData | AgendaData;
}

export type DisplayMode = "inline" | "fullscreen";

export interface WidgetState {
  selectedEventId: number | null;
}
