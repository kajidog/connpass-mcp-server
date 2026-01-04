---
"@kajidog/connpass-mcp-server": minor
---

feat: 認証機能の強化と Hono への移行

### 新機能

#### 認証とセキュリティ
- Hono フレームワークへの移行と HTTP トランスポートのリファクタリング
- `bearerAuth` ミドルウェアによる JWT 認証のサポートを追加
- Supabase およびローカル開発用認証サーバー のサポート

#### 構成の変更
- SSE (Server-Sent Events) トランスポートの廃止と削除
- 新しい認証フローに伴う `apps/web-auth` アプリケーション（認証 UI）の・連携追加
