# Connpass MCP Server

[![npm version](https://badge.fury.io/js/@kajidog%2Fconnpass-mcp-server.svg)](https://www.npmjs.com/package/@kajidog/connpass-mcp-server)

Connpass MCP Server は、MCP (Model Context Protocol) 経由で Connpass API を扱うためのツール群です。AI やエージェントが理解しやすいパラメータ設計になっており、自然言語に近い入力でイベント・グループ・ユーザー情報を取得できます。

## インストール

### npx で即座に起動

```bash
# 起動（デフォルト ポート 3000）
npx @kajidog/connpass-mcp-server

# ポート指定
npx @kajidog/connpass-mcp-server --port 8080

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

3. サーバーを起動します。

   ```bash
   CONNPASS_API_KEY=あなたのAPIキー pnpm --filter @kajidog/connpass-mcp-server start
   ```

   > ローカル開発時などで API キーが未設定の場合、`dummy-key` が自動で使用されます。

4. (オプション) OAuth 認証を有効にする場合:

   ```bash
   export MCP_OAUTH_ENABLED=true
   export MCP_JWKS_URI=https://your-auth-server/.well-known/jwks.json
   ```

   > ローカル開発用の認証サーバーは `apps/web-auth` を参照してください。

必要に応じて、デフォルトで参照するユーザー ID を `CONNPASS_DEFAULT_USER_ID` に設定できます。`search_schedule` ツールで `userId` を省略した場合に利用されます。

### コマンドラインオプション

```
Usage: connpass-mcp-server [options]

Options:
  -p, --port <number>     Port number (default: 3000)
  -h, --help             Show this help message

Examples:
  connpass-mcp-server              # Start on port 3000
  connpass-mcp-server -p 8080      # Start on port 8080
```

> **注意:** `PORT` 環境変数を設定することでも、ポートを変更できます。コマンドライン引数より優先されます。

### OAuth 2.0 / 2.1 認証

MCP サーバーを OAuth 2.0 リソースサーバーとして保護することができます。
有効化すると、すべてのリクエストに対して `Authorization: Bearer <token>` ヘッダーによるアクセストークンの提示が必須となります。
トークンの検証は、**JWT (JSON Web Token)** の署名検証（JWKS）を使用して行われます。Auth0, Supabase, Clerk など、OIDC/OAuth 2.0 準拠の ID プロバイダをサポートします。

#### 設定方法

環境変数 `MCP_OAUTH_ENABLED=true` を設定し、`MCP_JWKS_URI` を指定してください。

```bash
# OAuth 有効化の例 (認証サーバーで発行された JWT を検証)
export MCP_OAUTH_ENABLED=true
export MCP_AUTH_SERVER_URL=https://auth.example.com
export MCP_JWKS_URI=https://auth.example.com/.well-known/jwks.json
# オプション: 発行者 (iss) の検証
export MCP_ISSUER=https://auth.example.com/
```

#### 認証フロー

1. MCP クライアントは `/.well-known/oauth-protected-resource` にアクセスし、認可サーバーの情報を取得します。
2. クライアントは認可サーバーでアクセストークン (JWT) を取得します。
3. トークンを `Authorization` ヘッダーに付与して MCP サーバーの機能を利用します。
4. MCP サーバーは `MCP_JWKS_URI` から公開鍵を取得し、トークンの署名をローカルで検証します（高速かつ低コスト）。

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
| `MCP_OAUTH_ENABLED` | OAuth 認証を有効化するかどうか (`true`/`false`)。 | `false` |
| `MCP_SERVER_URL` | この MCP サーバー自身の URL（リソース ID として使用）。 | `http://localhost:3000` |
| `MCP_AUTH_SERVER_URL` | 認可サーバー (AS) の URL。メタデータでクライアントに通知されます。 | `http://localhost:3001` |
| `MCP_JWKS_URI` | JWT 署名検証用の公開鍵セット (JWKS) の URL。 | `${MCP_AUTH_SERVER_URL}/.well-known/jwks.json` |
| `MCP_ISSUER` | JWT の発行者 (`iss` クレーム) を検証する場合に指定。 | 未設定 (検証しない) |
| `MCP_OAUTH_SCOPES` | このリソースサーバーが要求するスコープ（カンマ区切り）。 | `mcp:tools,mcp:resources` |
| `MCP_RESOURCE_NAME` | リソース名（`WWW-Authenticate` ヘッダーの `realm` に使用）。 | `Connpass MCP Server` |
| `PORT` | サーバーのポート番号。コマンドライン引数より優先されます。 | `3000` |

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
