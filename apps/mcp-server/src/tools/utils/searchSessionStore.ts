import { randomUUID } from 'node:crypto'
import type { FormattedEventsResponse } from './formatting.js'

interface SearchSessionEntry {
  expiresAt: number
  result: FormattedEventsResponse
}

export interface SearchSessionStoreOptions {
  ttlMs?: number
}

export class SearchSessionStore {
  private readonly ttlMs: number
  private readonly sessions = new Map<string, SearchSessionEntry>()

  constructor(options: SearchSessionStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000
  }

  save(result: FormattedEventsResponse): string {
    this.cleanup()
    const sessionId = randomUUID()
    this.sessions.set(sessionId, {
      expiresAt: Date.now() + this.ttlMs,
      result,
    })
    return sessionId
  }

  get(sessionId: string): FormattedEventsResponse | undefined {
    this.cleanup()
    const entry = this.sessions.get(sessionId)
    if (!entry) {
      return undefined
    }

    if (entry.expiresAt <= Date.now()) {
      this.sessions.delete(sessionId)
      return undefined
    }

    return entry.result
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [sessionId, entry] of this.sessions.entries()) {
      if (entry.expiresAt <= now) {
        this.sessions.delete(sessionId)
      }
    }
  }
}
