# @kajidog/connpass-api-client

## 0.4.0

### Minor Changes

- [#15](https://github.com/kajidog/connpass-mcp-server/pull/15) [`e6aad57`](https://github.com/kajidog/connpass-mcp-server/commit/e6aad5793f53d73d4ee4e02999b1b0f47f5a000f) Thanks [@kajidog](https://github.com/kajidog)! - feat: MCP Apps Extension への移行とツール改善

  ### 変更内容

  #### アーキテクチャ移行

  - OpenAI Apps SDK から MCP Apps Extension へ移行
  - `packages/mcp-server` と `packages/widgets` を削除し、`apps/mcp-server` に統合
  - ツールのユーティリティファイルを `tools/utils/` に分離・整理

  #### AI ツールのレスポンス改善

  - `includeDetails` パラメータを追加（search_events, search_schedule, get_user_attended_events, get_user_presenter_events）
  - `get_event_detail` ツールを新設（イベント ID 指定で説明文・発表情報をフル取得）
  - catchPhrase の文字数制限を撤廃し、AI のイベント推薦精度を向上

  #### API クライアント (@kajidog/connpass-api-client)

  - Connpass API v2 レスポンス形式への互換マッピングを追加（Event, Group, User の各リポジトリ）
  - 都道府県ユーティリティを追加（`getAllPrefectures`, `normalizePrefecture`）
  - `prefecture` パラメータの配列対応（カンマ区切りに変換）

  #### 設定ファイルの整理

  - `.env.example`: 旧 packages/mcp-server 用設定（OAuth, Apps SDK output）を削除
  - `Dockerfile`: 単一 production ターゲットに統合
  - `docker-compose.yml`: サービス構成を更新
  - `biome.json`: 対象パスを apps/mcp-server に更新
  - `package.json`: changeset 依存を削除

## 0.3.0

### Minor Changes

- [`9bff083`](https://github.com/kajidog/connpass-mcp-server/commit/9bff083b1f8ae4f7587974ef0edee50ec6af15d9) Thanks [@kajidog](https://github.com/kajidog)! - feat: v0.3.0 - Add schedule widget and shared components

  ### New Features

  #### Schedule Widget

  - Add new `connpass-schedule` widget for displaying event schedules
  - Support date range filtering with `ym` and `ymd` parameters
  - New ScheduleView component with agenda-style layout

  #### Shared Components & Utilities

  - Add `packages/widgets/src/shared/` directory with reusable components
  - New `AgendaCard` shared component for consistent event display
  - Add `Badge` component for participant count display
  - Add OpenAI types for ChatGPT widget integration (`openai.ts`)
  - Add `use-openai-global` hook for OpenAI SDK integration
  - Add shared `normalize-tool-output` utility for consistent data handling

  #### Widget Metadata & Configuration

  - Add widget metadata for CSP (Content Security Policy) headers
  - Add `resource_domains` configuration (media.connpass.com)
  - Dynamic widget category mapping for improved widget handling

  ### Improvements

  #### HttpClient & Rate Limiting

  - Refactor rate limiting logic for improved request handling
  - Better error handling and retry mechanisms

  #### UI/UX Enhancements

  - Enhanced loading state in Carousel component
  - Improved DetailView layout for better user experience
  - Update owner label handling in AgendaCard and DetailView

  #### React Widget (from previous release)

  - React 19, Vite, and Tailwind CSS based widget system
  - Replace vanilla JS widget with React-based implementation
  - Add @kajidog/connpass-widgets as devDependency

  ### Documentation

  - Update README with new widget information
  - Add new screenshots for schedule widget

## 0.2.0

### Minor Changes

- [#5](https://github.com/kajidog/connpass-mcp-server/pull/5) [`ec91b05`](https://github.com/kajidog/connpass-mcp-server/commit/ec91b050de1b6e2ca2f2cd8fe2df3bdf13d36e63) Thanks [@kajidog](https://github.com/kajidog)! - - リクエストが遅延した場合でも他のリクエスト開始を待たせすぎないようにレートリミットのキュー処理を改善
  - 設定でレートリミットキューを無効化できるオプションを追加
  - MCP サーバーでも同じキュー制御を使用し、環境変数で待機時間や有効/無効を切り替え可能に

## 0.1.1

### Patch Changes

- [#1](https://github.com/kajidog/connpass-mcp-server/pull/1) [`909dc5e`](https://github.com/kajidog/connpass-mcp-server/commit/909dc5e16430ff9fb1ff5da907ee1882a2d44fd7) Thanks [@kajidog](https://github.com/kajidog)! - Add npm badges to package READMEs
