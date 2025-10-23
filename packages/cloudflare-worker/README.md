# Connpass MCP Server - Cloudflare Workers版

Cloudflare Workers上で動作するConnpass MCP Serverです。エッジで高速に動作し、グローバルに配信されます。

## 特徴

- **エッジでの高速実行**: Cloudflare Workersのエッジネットワークで動作
- **グローバルCDN**: 世界中どこからでも低レイテンシでアクセス可能
- **サーバーレス**: インフラ管理不要
- **KVキャッシュ**: プレゼンテーション情報をCloudflare KVにキャッシュ
- **無料枠あり**: 1日10万リクエストまで無料

## セットアップ

### 前提条件

- Node.js 18以上
- pnpm 9以上
- Cloudflareアカウント
- Wrangler CLI

### 1. Wrangler CLIのインストール

```bash
pnpm install -g wrangler
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

### 3. KV Namespaceの作成

```bash
# 本番用KV
wrangler kv:namespace create CONNPASS_CACHE

# プレビュー用KV
wrangler kv:namespace create CONNPASS_CACHE --preview
```

作成されたKV Namespace IDを`wrangler.toml`の以下の箇所に設定します：

```toml
[[kv_namespaces]]
binding = "CONNPASS_CACHE"
id = "ここに本番用KV IDを入力"
preview_id = "ここにプレビュー用KV IDを入力"
```

### 4. Connpass API Keyの設定

```bash
wrangler secret put CONNPASS_API_KEY
# プロンプトが表示されたらAPIキーを入力
```

### 5. ビルド

```bash
# ルートディレクトリから
pnpm install

# Cloudflare Workerパッケージをビルド
pnpm --filter @kajidog/connpass-mcp-worker build
```

## デプロイ

### 開発環境でテスト

```bash
cd packages/cloudflare-worker
pnpm dev
```

これでローカルで`http://localhost:8787`にサーバーが起動します。

### 本番環境にデプロイ

```bash
cd packages/cloudflare-worker
pnpm deploy
```

デプロイが完了すると、WorkersのURLが表示されます（例: `https://connpass-mcp-server.your-subdomain.workers.dev`）。

## 環境変数

以下の環境変数を`wrangler.toml`の`[vars]`セクションで設定できます：

| 変数名 | 説明 | デフォルト値 |
| --- | --- | --- |
| `CONNPASS_RATE_LIMIT_ENABLED` | レート制限を有効化 | `true` |
| `CONNPASS_RATE_LIMIT_DELAY_MS` | レート制限の待機時間（ミリ秒） | `1000` |
| `CONNPASS_PRESENTATION_CACHE_ENABLED` | プレゼンキャッシュを有効化 | `true` |
| `CONNPASS_PRESENTATION_CACHE_TTL_MS` | キャッシュの有効期限（ミリ秒） | `3600000` (1時間) |
| `CONNPASS_ENABLE_APPS_SDK_OUTPUT` | Apps SDK出力を有効化 | `false` |
| `CONNPASS_DEFAULT_USER_ID` | デフォルトユーザーID | 未設定 |
| `CONNPASS_INCLUDE_PRESENTATIONS_DEFAULT` | プレゼンを含めるか | 未設定 |

### シークレット

セキュアな情報は`wrangler secret`コマンドで設定します：

```bash
# Connpass API Key
wrangler secret put CONNPASS_API_KEY
```

## 使い方

デプロイ後、MCPクライアントから以下のURLに接続します：

```
https://connpass-mcp-server.your-subdomain.workers.dev
```

### MCP接続例

```json
POST https://connpass-mcp-server.your-subdomain.workers.dev
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": {
      "name": "example-client",
      "version": "1.0.0"
    },
    "capabilities": {}
  }
}
```

## ログの確認

```bash
cd packages/cloudflare-worker
pnpm tail
```

リアルタイムでWorkerのログを確認できます。

## 重要な注意事項

### レート制限について

Connpass APIは**1秒間に1リクエスト**のレート制限があります。

**Cloudflare Workers環境での課題：**
- Workersは複数インスタンスが並行実行されます
- 各インスタンスが独立してレート制限を管理するため、全体としてレート制限を超える可能性があります
- 特に高トラフィック時に問題になる可能性があります

**推奨設定：**

```toml
# wrangler.toml

# デモ・低トラフィック用途（デフォルト）
[vars]
CONNPASS_RATE_LIMIT_ENABLED = "true"
CONNPASS_RATE_LIMIT_DELAY_MS = "1000"

# 高トラフィック用途
# レート制限を無効化し、Connpass API側のエラーハンドリングに任せる
[vars]
CONNPASS_RATE_LIMIT_ENABLED = "false"
```

**CPU時間について：**
- `await`での待機はCPU時間にカウントされません（Wall clock timeのみ）
- 1秒待機してもCPU timeは数ms程度なので、無料プランでも問題ありません
- ただし、`includePresentations=true`で複数イベントを取得する場合は注意が必要です

### ウィジェット機能

Cloudflare WorkersではNode.jsのファイルシステムAPIが使えないため、ウィジェット機能は無効化されています。

- `CONNPASS_ENABLE_APPS_SDK_OUTPUT`はデフォルトで`false`
- `structuredContent`は返されますが、HTMLウィジェットは表示されません
- 必要に応じてHTMLを文字列定数として埋め込むことで対応可能です

## 制限事項

### Cloudflare Workersの制限

- **CPU時間**: 無料プランは10ms、有料プランは50ms
- **メモリ**: 128MB
- **リクエストサイズ**: 100MB
- **レスポンスサイズ**: 無制限（ストリーミング）

### KVの制限

- **読み取り**: 無料プランは1日10万回
- **書き込み**: 無料プランは1日1000回
- **ストレージ**: 無料プランは1GB

詳細は[Cloudflare Workers料金](https://developers.cloudflare.com/workers/platform/pricing/)を参照してください。

## トラブルシューティング

### デプロイエラー

```bash
# Wranglerの設定を確認
wrangler whoami

# KV Namespaceを確認
wrangler kv:namespace list
```

### ログの確認

```bash
# リアルタイムログ
wrangler tail

# 特定のWorkerのログ
wrangler tail connpass-mcp-server
```

### KVキャッシュのクリア

```bash
# すべてのキーを削除（注意！）
wrangler kv:key list --namespace-id=YOUR_KV_ID | jq -r '.[].name' | xargs -I {} wrangler kv:key delete {} --namespace-id=YOUR_KV_ID
```

## 開発

### 型チェック

```bash
pnpm typecheck
```

### ローカル開発

```bash
pnpm dev
```

## ライセンス

MIT
