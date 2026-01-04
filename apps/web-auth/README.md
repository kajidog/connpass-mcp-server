# MCP Web Auth

MCP サーバーの OAuth 認証用ログイン画面です。Supabase Auth を使用しています。

## セットアップ

1. Supabase プロジェクトを作成
2. `.env` ファイルを作成

```bash
cp .env.example .env
# VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定
```

3. Supabase の Authentication 設定で Redirect URLs に以下を追加:
   - `http://localhost:5173` (開発用)
   - `https://your-github-pages-url` (本番用)

## 開発

```bash
pnpm dev
```

## ビルド

```bash
pnpm build
```

`dist/` フォルダが生成されます。

## GitHub Pages デプロイ

1. GitHub リポジトリの Settings > Pages で Source を "GitHub Actions" に設定
2. `.github/workflows/deploy-auth.yml` を作成（または手動で dist/ を gh-pages ブランチにプッシュ）

## 使い方

MCP クライアントからこの認証画面にリダイレクトします:

```
https://your-auth-page.github.io/?redirect_uri=YOUR_CALLBACK_URL&state=RANDOM_STATE
```

ログイン成功後、以下のパラメータ付きで `redirect_uri` にリダイレクトされます:

- `access_token` - Supabase JWT
- `token_type` - "bearer"
- `expires_in` - 有効期限（秒）
- `state` - 元のリクエストの state 値
