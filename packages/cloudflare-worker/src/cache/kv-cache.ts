import type { PresentationsResponse, IPresentationCache } from "@kajidog/connpass-api-client";

interface CacheEntry {
  expiresAt: number;
  data: PresentationsResponse;
}

export interface KVCacheOptions {
  kv: KVNamespace;
  ttlMs: number;
  enabled: boolean;
}

export class KVPresentationCache implements IPresentationCache {
  private readonly kv: KVNamespace;
  private readonly ttlMs: number;
  private readonly enabled: boolean;

  constructor(options: KVCacheOptions) {
    this.kv = options.kv;
    this.ttlMs = Math.max(options.ttlMs, 0);
    this.enabled = options.enabled;
  }

  async get(eventId: number): Promise<PresentationsResponse | undefined> {
    if (!this.enabled) {
      return undefined;
    }

    try {
      const key = this.getCacheKey(eventId);
      const cached = await this.kv.get<CacheEntry>(key, "json");

      if (!cached) {
        return undefined;
      }

      if (this.ttlMs === 0 || Date.now() <= cached.expiresAt) {
        return cached.data;
      }

      // Expired, delete it
      await this.kv.delete(key);
      return undefined;
    } catch (error) {
      console.warn("[kv-cache] Failed to get from cache:", error);
      return undefined;
    }
  }

  async set(eventId: number, data: PresentationsResponse): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      const key = this.getCacheKey(eventId);
      const expiresAt = this.ttlMs === 0 ? Number.MAX_SAFE_INTEGER : Date.now() + this.ttlMs;
      const entry: CacheEntry = { data, expiresAt };

      // KV expirationTtl in seconds (max 60000 days)
      const ttlSeconds = this.ttlMs === 0 ? undefined : Math.floor(this.ttlMs / 1000);

      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttlSeconds,
      });
    } catch (error) {
      console.warn("[kv-cache] Failed to set cache:", error);
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // Note: KV doesn't have a clear all operation
    // You would need to list and delete keys individually
    // For now, we'll just log a warning
    console.warn("[kv-cache] Clear operation not implemented for KV");
  }

  private getCacheKey(eventId: number): string {
    return `presentation:${eventId}`;
  }
}
