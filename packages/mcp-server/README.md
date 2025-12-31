# Connpass MCP Server

[![npm version](https://badge.fury.io/js/@kajidog%2Fconnpass-mcp-server.svg)](https://www.npmjs.com/package/@kajidog/connpass-mcp-server)

Connpass MCP Server は、MCP (Model Context Protocol) 経由で Connpass API を扱うためのツール群です。AI やエージェントが理解しやすいパラメータ設計になっており、自然言語に近い入力でイベント・グループ・ユーザー情報を取得できます。

## インストール

### npx で即座に起動

```bash
# HTTP トランスポートで起動（デフォルト）
npx @kajidog/connpass-mcp-server

# ポート指定
npx @kajidog/connpass-mcp-server --port 8080

# SSE トランスポートで起動
npx @kajidog/connpass-mcp-server --transport sse

# ヘルプを表示
npx @kajidog/connpass-mcp-server --help
```

環境変数を設定する場合：

```bash
CONNPASS_API_KEY=your-api-key npx @kajidog/connpass-mcp-server
```

### グローバルインストール

```bash
# インストール
npm install -g @kajidog/connpass-mcp-server

# 実行
connpass-mcp-server
```

## 開発用セットアップ

1. 依存関係をインストールします。

   ```bash
   pnpm install
   ```

2. ビルドして利用可能な状態にします。

   ```bash
   pnpm --filter @kajidog/connpass-mcp-server build
   ```

3. Connpass API キーを環境変数で指定してサーバーを起動します。

   ```bash
   CONNPASS_API_KEY=あなたのAPIキー pnpm --filter @kajidog/connpass-mcp-server start
   ```

   > ローカル開発時などで API キーが未設定の場合、`dummy-key` が自動で使用されます。

必要に応じて、デフォルトで参照するユーザー ID を `CONNPASS_DEFAULT_USER_ID` に設定できます。`search_schedule` ツールで `userId` を省略した場合に利用されます。

## トランスポート方式

Connpass MCP Server は2つのトランスポート方式に対応しています。

### HTTP (Streamable HTTP) - デフォルト

デフォルトのトランスポート方式です。HTTPリクエスト/レスポンスベースで通信します。

```bash
# デフォルトで HTTP トランスポートを使用 (ポート 3000)
connpass-mcp-server

# ポートを指定
connpass-mcp-server --port 8080
connpass-mcp-server -p 8080

# 明示的に HTTP トランスポートを指定
connpass-mcp-server --transport http
connpass-mcp-server -t http
```

### SSE (Server-Sent Events)

Server-Sent Events を使用した双方向通信です。

```bash
# SSE トランスポートを使用
connpass-mcp-server --transport sse

# ポートを指定
connpass-mcp-server --transport sse --port 8080
connpass-mcp-server -t sse -p 8080
```

### コマンドラインオプション

```
Usage: connpass-mcp-server [options]

Options:
  -t, --transport <type>  Transport type: http or sse (default: http)
  -p, --port <number>     Port number for http/sse transports (default: 3000)
  -h, --help             Show this help message

Examples:
  connpass-mcp-server                           # Start with HTTP transport on port 3000
  connpass-mcp-server --transport sse --port 8080  # Start with SSE transport on port 8080
  connpass-mcp-server -t http -p 5000          # Start with HTTP transport on port 5000
```

> **注意:** `PORT` および `MCP_TRANSPORT` 環境変数を設定することでも、ポートやトランスポート方式を変更できます。コマンドライン引数よりも環境変数が優先されます。

### 環境変数一覧

| 変数名 | 説明 | 既定値 |
| --- | --- | --- |
| `CONNPASS_API_KEY` | Connpass API Key。未設定の場合は `dummy-key` が使われます（本番利用不可）。 | `dummy-key` |
| `CONNPASS_DEFAULT_USER_ID` | `search_schedule` で `userId` を省略したときに使うユーザー ID。 | 未設定 |
| `CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT` | `search_schedule` の `includePresentations` の既定値。`true/false` や `1/0` などで指定。 | 未設定（false と同等） |
| `CONNPASS_RATE_LIMIT_ENABLED` | API クライアントのレート制限キューを有効/無効化します。`false` にすると 1 秒間隔の待機をスキップします。 | `true` |
| `CONNPASS_RATE_LIMIT_DELAY_MS` | レート制限キューが適用する待機時間（ミリ秒）。Connpass 既定は 1000 ミリ秒です。 | `1000` |
| `CONNPASS_PRESENTATION_CACHE_ENABLED` | プレゼンテーション取得結果をディスクキャッシュするかどうか。 | `true` |
| `CONNPASS_PRESENTATION_CACHE_TTL_MS` | キャッシュ保持期間（ミリ秒）。 | `3600000` |
| `CONNPASS_PRESENTATION_CACHE_PATH` | キャッシュファイルの保存先パス。 | `./data/presentation-cache.json` |
| `CONNPASS_ENABLE_APPS_SDK_OUTPUT` | Apps SDK 互換の `structuredContent` をツール応答に含めるかどうか。`true/false` や `1/0` などで指定。 | `false` |
| `MCP_BASE_PATH` | MCP エンドポイントのベースパス。リバースプロキシで `/mcp` を `/` に転送する場合などに `/` を指定。(SSE トランスポートのみ) | `/mcp` |
| `MCP_TRANSPORT` | トランスポート方式 (`http`, `sse`)。コマンドライン引数より優先されます。 | 未設定 |
| `PORT` | サーバーのポート番号 (http, sse トランスポートのみ)。コマンドライン引数より優先されます。 | `3000` |

## ツール一覧

| ツール名 | 説明 | 主な入力フィールド |
| --- | --- | --- |
| `search_events` | 自然言語の日付やキーワードでイベントを検索 | `query`, `anyQuery`, `on`, `from`, `to`, `participantNickname`, `hostNickname`, `groupIds`, `prefectures`, `page`, `pageSize`, `sort` |
| `get_event_presentations` | 指定イベントの発表情報を取得 | `eventId` |
| `search_groups` | グループをキーワードや所在地で検索 | `query`, `groupIds`, `country`, `prefecture`, `page`, `pageSize`, `sort` |
| `search_users` | ニックネームなどでユーザーを検索 | `nickname`, `userIds`, `page`, `pageSize`, `sort` |
| `get_user_groups` | 指定ユーザーが所属するグループ一覧 | `userId`, `limit`, `page` |
| `get_user_attended_events` | 指定ユーザーが参加したイベント一覧 | `userId`, `limit`, `page`, `sort` |
| `get_user_presenter_events` | 指定ユーザーが登壇したイベント一覧 | `userId`, `limit`, `page`, `sort` |
| `search_schedule` | ユーザーのスケジュール（今日と今後のイベント）を検索 | `userId`, `nickname`, `daysAhead`, `maxEvents`, `includePresentations` |

## シンプルな使い方

### イベント検索（例）

```json
{
  "name": "search_events",
  "arguments": {
    "query": "React 勉強会",
    "from": "2025-11-01",
    "to": "2025-11-07",
    "prefectures": "東京都",
    "sort": "start-date-asc"
  }
}
```

- 日付は `"2025-11-01"` のような YYYY-MM-DD 形式、または `"20251101"` のような YYYYMMDD 形式で指定します。
- `prefectures` や `on` は単一文字列でも配列でも指定可能です。

### グループ検索（例）

```json
{
  "name": "search_groups",
  "arguments": {
    "query": "AI",
    "country": "JP",
    "sort": "most-members"
  }
}
```

### ユーザーの登壇イベント取得（例）

```json
{
  "name": "get_user_presenter_events",
  "arguments": {
    "userId": 123456,
    "limit": 30,
    "sort": "newly-added"
  }
}
```

### スケジュール検索（例）

```json
{
  "name": "search_schedule",
  "arguments": {
    "nickname": "kajidog",
    "daysAhead": 10,
    "includePresentations": true
  }
}
```

- `userId` を省略すると、`CONNPASS_DEFAULT_USER_ID` 環境変数が使われます。
- `nickname` を指定すると、そのニックネームでユーザーを検索してイベントを取得します。`userId` と `nickname` の両方が指定された場合は `nickname` が優先されます。
- `includePresentations` を有効にすると、各イベントの発表詳細を個別に取得します（ Connpass API は 1 秒あたり 1 リクエストのレートリミットなので、イベント数が多いと時間がかかります）。省略時は `CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT` の設定が利用されます。

## 返り値


`CONNPASS_ENABLE_APPS_SDK_OUTPUT` を `true` にすると、MCP の `call_tool` 応答へ OpenAI Apps SDK が扱いやすい `structuredContent` を追加します。Apps SDK 側では `toolOutput` として同じペイロードが受け取れるため、カスタム UI でデータをレンダリングしやすくなります。既存のテキスト出力は変わりません。

### Apps SDK 向けウィジェット

- `search_events` の実行結果にはカルーセルウィジェット、`search_schedule` の実行結果にはスケジュールウィジェットが付与されます。どちらもフルスクリーン詳細に切り替え可能です。
- `CONNPASS_ENABLE_APPS_SDK_OUTPUT=true` を指定すると、`openai/outputTemplate` メタデータが `ui://connpass/widgets/events-carousel` を指し、Apps SDK 側で iframe がレンダリングされます。
- ウィジェットの HTML は `packages/mcp-server/src/widgets/connpass-events.html` に置いており、`pnpm --filter @kajidog/connpass-mcp-server build` 実行時に `dist/widgets/` へコピーされます。
- カルーセルでは参加者数バッジや Connpass への外部リンクを表示。`詳細を見る` ボタンを押すと `requestDisplayMode` API で全画面表示に切り替わり、イベント概要・発表セッション・外部リンクを閲覧できます。
- サーバーをサブパスで公開する場合は `MCP_BASE_PATH` を設定してください（例: リバースプロキシで `/mcp` を `/` にリライトする場合は `MCP_BASE_PATH=/`）。`GET ${MCP_BASE_PATH}` が SSE ストリーム、`${MCP_BASE_PATH}/messages` が POST エンドポイントになります。

## 開発補助

- 型チェック: `pnpm --filter @kajidog/connpass-mcp-server typecheck`
- ウォッチビルド: `pnpm --filter @kajidog/connpass-mcp-server dev`

ツールの追加や更新を行った際は、`pnpm build` 実行後に README も更新して最新の引数仕様を反映するようにしてください。
