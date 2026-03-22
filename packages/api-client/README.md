# Connpass API Client

[![npm version](https://badge.fury.io/js/@kajidog%2Fconnpass-api-client.svg)](https://www.npmjs.com/package/@kajidog/connpass-api-client)

TypeScript client for Connpass API v2 with clean architecture design.

## Installation

```bash
pnpm install @kajidog/connpass-api-client
```

## Usage

### Basic Usage

```typescript
import { ConnpassClient } from '@kajidog/connpass-api-client';

const client = new ConnpassClient({
  apiKey: 'your-api-key-here'
});

// Search for events
const events = await client.searchEvents({
  keyword: 'TypeScript',
  count: 10
});

console.log(events.events);
```

### Configuration Options

```typescript
const client = new ConnpassClient({
  apiKey: 'your-api-key-here',
  baseURL: 'https://connpass.com/api/v2', // optional, default value
  timeout: 30000, // optional, default 30 seconds
  rateLimitDelay: 1000, // optional, default 1 second between requests
  rateLimitEnabled: true, // optional, default true. Disable to opt-out of queuing
  enablePresentationCache: true, // optional, default true
  presentationCacheTtlMs: 1000 * 60 * 60, // optional, default 1 hour
  presentationCachePath: './data/presentation-cache.json' // optional, default cwd/data
});
```

### Available Methods

#### Events

```typescript
// Search events with pagination
const events = await client.searchEvents({
  keyword: 'JavaScript',
  ymdFrom: '2024-01-01',
  ymdTo: '2024-12-31',
  prefecture: ['tokyo', 'osaka'],
  count: 20,
  start: 1
});

// Get all events (automatically handles pagination)
const allEvents = await client.getAllEvents({
  keyword: 'React'
});

// Get event presentations
const presentations = await client.getEventPresentations(12345);
```

#### Groups

```typescript
// Search groups
const groups = await client.searchGroups({
  keyword: 'JavaScript',
  prefecture: 'tokyo'
});

// Get all groups
const allGroups = await client.getAllGroups({
  keyword: 'TypeScript'
});
```

#### Users

```typescript
// Search users
const users = await client.searchUsers({
  nickname: 'example_user'
});

// Get user's groups
const userGroups = await client.getUserGroups(12345);

// Get user's attended events
const attendedEvents = await client.getUserAttendedEvents(12345);
const sameResult = await client.getUserAttendedEvents('kajidog');

// Get user's presenter events
const presenterEvents = await client.getUserPresenterEvents(12345);
```

#### Prefectures

```typescript
import { getAllPrefectures, normalizePrefecture } from '@kajidog/connpass-api-client';

// Get all prefecture options
const prefectures = getAllPrefectures();
// [{ code: 'hokkaido', name: '北海道' }, { code: 'aomori', name: '青森県' }, ...]

// Normalize prefecture input (name or code → code)
normalizePrefecture('東京都');  // 'tokyo'
normalizePrefecture('tokyo');   // 'tokyo'
normalizePrefecture('invalid'); // undefined
```

### Error Handling

```typescript
import {
  ConnpassError,
  ConnpassApiError,
  ConnpassRateLimitError,
  ConnpassValidationError,
  ConnpassTimeoutError
} from '@kajidog/connpass-api-client';

try {
  const events = await client.searchEvents({ keyword: 'TypeScript' });
} catch (error) {
  if (error instanceof ConnpassRateLimitError) {
    console.log('Rate limit exceeded, please wait');
  } else if (error instanceof ConnpassValidationError) {
    console.log('Invalid parameters:', error.message);
  } else if (error instanceof ConnpassApiError) {
    console.log('API error:', error.statusCode, error.message);
  } else if (error instanceof ConnpassTimeoutError) {
    console.log('Request timeout');
  }
}
```

### Search Parameters

#### Event Search Parameters

- `eventId`: Array of event IDs
- `keyword`: Search keyword (AND search)
- `keywordOr`: Search keyword (OR search)
- `ymdFrom`: Start date (YYYY-MM-DD format)
- `ymdTo`: End date (YYYY-MM-DD format)
- `nickname`: Participant nickname
- `ownerNickname`: Event owner nickname
- `groupId`: Array of group IDs
- `prefecture`: Array of prefecture codes (e.g. `['tokyo', 'osaka']`)
- `count`: Number of results (1-100, default 10)
- `order`: Sort order (1: updated_at desc, 2: started_at asc, 3: started_at desc)
- `start`: Start position for pagination

#### Group Search Parameters

- `groupId`: Array of group IDs
- `keyword`: Search keyword
- `countryCode`: Country code
- `prefecture`: Prefecture code
- `count`: Number of results (1-100, default 10)
- `order`: Sort order
- `start`: Start position for pagination

#### User Search Parameters

- `userId`: Array of user IDs
- `nickname`: User nickname
- `count`: Number of results (1-100, default 10)
- `order`: Sort order
- `start`: Start position for pagination

## License

MIT
