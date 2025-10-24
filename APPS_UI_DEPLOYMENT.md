# Apps UI Deployment Guide

## 概要

OpenAI Apps SDKを使用したReactベースのウィジェットUIを実装しました。これにより：

1. **Cloudflare Workerでのファイルシステムアクセス問題を解決**
2. **mcp-serverとの重複コードを削減**
3. **より柔軟なUI実装が可能に**

## 実装されたコンポーネント

### パッケージ構成
```
packages/apps-ui/
├── src/
│   ├── components/
│   │   ├── EventCarousel.tsx    # イベントカルーセル
│   │   ├── EventCard.tsx         # イベントカード
│   │   ├── EventFullscreen.tsx   # フルスクリーン詳細表示
│   │   ├── EventAgenda.tsx       # アジェンダビュー
│   │   └── EmptyState.tsx        # 空状態表示
│   ├── types.ts                  # 型定義
│   ├── utils.ts                  # ユーティリティ関数
│   ├── App.tsx                   # メインアプリ
│   └── main.tsx                  # エントリーポイント
├── package.json
├── vite.config.ts
└── wrangler.toml
```

## デプロイ手順

### オプション1: Cloudflare Pages (推奨)

1. **ビルド**
   ```bash
   cd packages/apps-ui
   pnpm build
   ```

2. **デプロイ**
   ```bash
   npx wrangler pages deploy dist --project-name=connpass-apps-ui
   ```

3. **デプロイURL取得**
   - `https://connpass-apps-ui.pages.dev` のような形式

### オプション2: Cloudflare Pages (Git統合)

1. Cloudflare Dashboardで Pages プロジェクトを作成
2. GitHubリポジトリを接続
3. ビルド設定:
   - **Build command**: `cd packages/apps-ui && pnpm build`
   - **Build output directory**: `packages/apps-ui/dist`
   - **Root directory**: `/`

### オプション3: その他のホスティング

`dist/`フォルダを以下にデプロイ可能:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

## MCPサーバーの設定更新

デプロイ後、以下のファイルを更新してReactアプリのURLを参照させます：

### 1. mcp-serverのウィジェットURI更新

```typescript
// packages/mcp-server/src/widgets/connpass-events.ts
export const CONNPASS_EVENTS_WIDGET_URI =
  "https://your-deployed-url.pages.dev"; // デプロイしたURLに変更
```

### 2. cloudflare-workerのウィジェット実装更新

```typescript
// packages/cloudflare-worker/src/widgets.ts
export function listResources(): Resource[] {
  return [{
    uri: "https://your-deployed-url.pages.dev",
    name: "Connpass events carousel",
    description: "Inline carousel widget with fullscreen detail view for Connpass events",
    mimeType: "text/html+sky",
    _meta: {
      "openai/outputTemplate": "https://your-deployed-url.pages.dev",
      "openai/widgetAccessible": true,
      "openai/resultCanProduceWidget": true,
    },
  }];
}

export function getWidgetTemplateForTool(toolName: string): string | undefined {
  const TOOL_WIDGET_MAP = new Map<string, string>([
    ["search_events", "https://your-deployed-url.pages.dev"],
    ["get_my_upcoming_events", "https://your-deployed-url.pages.dev"],
  ]);
  return TOOL_WIDGET_MAP.get(toolName);
}
```

## 重複コードの削減

### 共有パッケージの作成（オプション）

`apps-sdk.ts`の重複を解消するため、以下のオプションがあります：

#### オプション1: 共有パッケージ作成
```bash
mkdir -p packages/shared/src
```

```typescript
// packages/shared/src/apps-sdk.ts
// mcp-server/cloudflare-workerから移動
```

```json
// packages/shared/package.json
{
  "name": "@kajidog/connpass-shared",
  "exports": {
    "./apps-sdk": "./src/apps-sdk.ts"
  }
}
```

#### オプション2: mcp-serverから再エクスポート（簡易）

cloudflare-workerで直接インポート:
```typescript
// packages/cloudflare-worker/src/worker.ts
import { buildCallToolResult } from "@kajidog/connpass-mcp-server/apps-sdk";
```

mcp-serverのpackage.jsonにexportsを追加:
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./apps-sdk": "./dist/apps-sdk.js"
  }
}
```

## テスト

### ローカル開発サーバー
```bash
cd packages/apps-ui
pnpm dev
# http://localhost:3000 でアクセス
```

### プロダクションプレビュー
```bash
pnpm build
pnpm preview
```

## 次のステップ

1. ✅ Reactアプリのビルド成功
2. ⏳ Cloudflare Pagesへのデプロイ
3. ⏳ MCPサーバーのウィジェットURI更新
4. ⏳ 重複コード削減（apps-sdk.ts）
5. ⏳ 動作確認とテスト

## トラブルシューティング

### ビルドエラー
- `pnpm install`を再実行
- `node_modules`を削除して再インストール

### 型エラー
- `vite-env.d.ts`が存在することを確認
- `tsconfig.json`の設定を確認

### デプロイエラー
- Wrangler CLIが最新版か確認: `npm install -g wrangler@latest`
- Cloudflareアカウントにログイン: `wrangler login`

## 参考リンク

- [OpenAI Apps SDK Documentation](https://developers.openai.com/apps-sdk/)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Vite Documentation](https://vitejs.dev/)
