import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { stringify } from 'qs';
import { ConnpassApiError, ConnpassRateLimitError, ConnpassTimeoutError, ConnpassError } from '../../domain/errors';

export interface HttpClientConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
  rateLimitDelay?: number;
  rateLimitEnabled?: boolean;
  userAgent: string;
}

export class HttpClient {
  private client: AxiosInstance;
  private lastRequestTime: number = 0;
  private rateLimitDelay: number;
  private rateLimitEnabled: boolean;
  private rateLimiterTail: Promise<void> = Promise.resolve();
  private nextAvailableTime: number = 0;

  constructor(config: HttpClientConfig) {
    this.rateLimitDelay = config.rateLimitDelay ?? 1000;
    this.rateLimitEnabled = config.rateLimitEnabled ?? true;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': config.userAgent,
      },
      paramsSerializer: params => {
        return stringify(params, { arrayFormat: 'repeat' });
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new ConnpassTimeoutError('Request timeout');
        }

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          switch (status) {
            case 429:
              throw new ConnpassRateLimitError('Rate limit exceeded');
            case 400:
              throw new ConnpassApiError('Bad Request', status, data);
            case 401:
              throw new ConnpassApiError('Unauthorized - Invalid API key', status, data);
            case 403:
              throw new ConnpassApiError('Forbidden', status, data);
            case 404:
              throw new ConnpassApiError('Not Found', status, data);
            case 500:
              throw new ConnpassApiError('Internal Server Error', status, data);
            default:
              throw new ConnpassApiError(`HTTP ${status}`, status, data);
          }
        }

        throw new ConnpassError(`Network error: ${error.message}`);
      }
    );
  }

  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const scheduledStart = Math.max(now, this.nextAvailableTime);
    const waitTime = scheduledStart - now;

    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private scheduleRequest<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.rateLimitEnabled || this.rateLimitDelay <= 0) {
      return fn();
    }

    // Chain: wait for previous request -> apply rate limit -> execute request
    const requestPromise = this.rateLimiterTail
      .then(async () => {
        // Wait until we can start the next request
        await this.applyRateLimit();

        // Execute the request
        const result = await fn();

        // Update next available time AFTER request completes
        // This ensures the next request waits for both:
        // 1. The previous request to complete
        // 2. The configured delay (rateLimitDelay) after completion
        this.nextAvailableTime = Date.now() + this.rateLimitDelay;

        return result;
      });

    // Update tail to wait for this request to complete before starting next
    this.rateLimiterTail = requestPromise.then(
      () => undefined,
      () => undefined
    );

    return requestPromise;
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<AxiosResponse<T>> {
    return this.scheduleRequest(() => this.client.get<T>(url, { params }));
  }
}
