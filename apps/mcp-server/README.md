# Connpass MCP Server

[![npm version](https://badge.fury.io/js/@kajidog%2Fconnpass-mcp-server.svg)](https://www.npmjs.com/package/@kajidog/connpass-mcp-server)

Connpass MCP Server は、MCP (Model Context Protocol) 経由で Connpass API を扱うためのツール群です。AI やエージェントが理解しやすいパラメータ設計になっており、自然言語に近い入力でイベント・グループ・ユーザー情報を取得できます。

MCP Apps Extension 対応クライアントでは、インタラクティブなイベントブラウザ UI も利用できます。

## インストール

### npx で即座に起動（stdio モード）

```bash
# 起動
npx @kajidog/connpass-mcp-server

# API キーを指定
CONNPASS_API_KEY=your-api-key npx @kajidog/connpass-mcp-server

# ヘルプを表示
npx @kajidog/connpass-mcp-server --help
```

### HTTP モードで起動

```bash
npx @kajidog/connpass-mcp-server --http --port 3000
```

### グローバルインストール

```bash
npm install -g @kajidog/connpass-mcp-server
connpass-mcp-server
```

## 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `CONNPASS_API_KEY` | Connpass API キー | - |
| `CONNPASS_DEFAULT_USER_ID` | `search_schedule` で `userId` 省略時に使うユーザー ID | - |
| `CONNPASS_RATE_LIMIT_ENABLED` | API レート制限の有効化 | `true` |
| `CONNPASS_RATE_LIMIT_DELAY_MS` | レート制限の遅延 (ms) | `1000` |
| `MCP_HTTP_MODE` | HTTP モードで起動 | `false` |
| `MCP_HTTP_PORT` | HTTP モードのポート | `3000` |
| `MCP_HTTP_HOST` | HTTP モードのホスト | `0.0.0.0` |
| `MCP_API_KEY` | HTTP モードの API キー認証 | - |

## ツール一覧

### イベント

| ツール名 | 説明 | 主な入力 |
|----------|------|----------|
| `search_events` | キーワードや日付でイベントを検索 | `query`, `from`, `to`, `prefectures`, `sort`, `includeDetails` |
| `browse_events` | インタラクティブ UI でイベントをブラウズ | `query`, `from`, `to`, `prefectures`, `sort` |
| `get_event_detail` | イベント ID を指定して詳細をフル取得 | `eventId` |
| `get_event_presentations` | イベントの発表情報を取得 | `eventId` |
| `search_schedule` | ユーザーのスケジュールを検索 | `userId`, `nickname`, `fromDate`, `toDate`, `includeDetails` |

### グループ

| ツール名 | 説明 | 主な入力 |
|----------|------|----------|
| `search_groups` | グループをキーワードや所在地で検索 | `query`, `country`, `prefecture`, `sort` |

### ユーザー

| ツール名 | 説明 | 主な入力 |
|----------|------|----------|
| `search_users` | ニックネームなどでユーザーを検索 | `nickname`, `userIds`, `sort` |
| `get_user_groups` | ユーザーが所属するグループ一覧 | `userId` |
| `get_user_attended_events` | ユーザーが参加したイベント一覧 | `userId`, `includeDetails` |
| `get_user_presenter_events` | ユーザーが登壇したイベント一覧 | `userId`, `includeDetails` |

### その他

| ツール名 | 説明 |
|----------|------|
| `list_prefectures` | 利用可能な都道府県コード一覧 |

### `includeDetails` パラメータ

`search_events`, `search_schedule`, `get_user_attended_events`, `get_user_presenter_events` では、`includeDetails: true` を指定するとイベントの説明文（200文字まで）が含まれます。AI がおすすめイベントを判断する際に有用です。

デフォルト (`false`) では、タイトル・キャッチフレーズ・日時・会場・参加者数・URL などの基本情報のみを返します。

個別イベントの完全な説明文が必要な場合は `get_event_detail` を使用してください。

## 使い方の例

### イベント検索

```json
{
  "name": "search_events",
  "arguments": {
    "query": "React 勉強会",
    "from": "2025-11-01",
    "to": "2025-11-07",
    "prefectures": "東京都",
    "sort": "start-date-asc",
    "includeDetails": true
  }
}
```

### スケジュール検索

```json
{
  "name": "search_schedule",
  "arguments": {
    "nickname": "kajidog",
    "fromDate": "2025-11-01",
    "toDate": "2025-11-07"
  }
}
```

### イベント詳細取得

```json
{
  "name": "get_event_detail",
  "arguments": {
    "eventId": 12345
  }
}
```

## 開発

```bash
# 依存関係をインストール
pnpm install

# ビルド
pnpm --filter @kajidog/connpass-mcp-server build

# 開発モード (stdio)
pnpm --filter @kajidog/connpass-mcp-server dev

# 開発モード (HTTP)
pnpm --filter @kajidog/connpass-mcp-server dev:http
```

## ライセンス

MIT
