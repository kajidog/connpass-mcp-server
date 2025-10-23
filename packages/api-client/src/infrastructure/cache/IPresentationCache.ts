import type { PresentationsResponse } from '../../domain/entities';

export interface IPresentationCache {
  get(eventId: number): Promise<PresentationsResponse | undefined>;
  set(eventId: number, data: PresentationsResponse): Promise<void>;
  clear(): Promise<void>;
}
