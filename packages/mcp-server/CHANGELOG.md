# @kajidog/connpass-mcp-server

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

### Patch Changes

- Updated dependencies [[`9bff083`](https://github.com/kajidog/connpass-mcp-server/commit/9bff083b1f8ae4f7587974ef0edee50ec6af15d9)]:
  - @kajidog/connpass-api-client@0.3.0

## 0.2.0

### Minor Changes

- [#10](https://github.com/kajidog/connpass-mcp-server/pull/10) [`25b7659`](https://github.com/kajidog/connpass-mcp-server/commit/25b7659850bd71bd004072954ebc6d37334ab347) Thanks [@kajidog](https://github.com/kajidog)! - **BREAKING CHANGE**: 自然言語による日付入力のサポートを削除しました。

  日付パラメータ（`on`, `from`, `to`）は、YYYY-MM-DD または YYYYMMDD フォーマットのみを受け付けるようになりました。

  以前サポートされていた以下の表現は使用できなくなります：

  - `today`, `tomorrow`, `yesterday` などの相対日付キーワード
  - `Date.parse()` で解析可能な自然言語表現（例: `next Monday`）

  **移行ガイド:**

  - `today` → 現在の日付を YYYY-MM-DD 形式で指定（例: `2025-10-28`）
  - `tomorrow` → 翌日の日付を YYYY-MM-DD 形式で指定（例: `2025-10-29`）
  - `next Monday` → 具体的な日付を YYYY-MM-DD 形式で指定（例: `2025-11-03`）

### Patch Changes

- [#5](https://github.com/kajidog/connpass-mcp-server/pull/5) [`ec91b05`](https://github.com/kajidog/connpass-mcp-server/commit/ec91b050de1b6e2ca2f2cd8fe2df3bdf13d36e63) Thanks [@kajidog](https://github.com/kajidog)! - - リクエストが遅延した場合でも他のリクエスト開始を待たせすぎないようにレートリミットのキュー処理を改善
  - 設定でレートリミットキューを無効化できるオプションを追加
  - MCP サーバーでも同じキュー制御を使用し、環境変数で待機時間や有効/無効を切り替え可能に
- Updated dependencies [[`ec91b05`](https://github.com/kajidog/connpass-mcp-server/commit/ec91b050de1b6e2ca2f2cd8fe2df3bdf13d36e63)]:
  - @kajidog/connpass-api-client@0.2.0

## 0.1.1

### Patch Changes

- [#1](https://github.com/kajidog/connpass-mcp-server/pull/1) [`909dc5e`](https://github.com/kajidog/connpass-mcp-server/commit/909dc5e16430ff9fb1ff5da907ee1882a2d44fd7) Thanks [@kajidog](https://github.com/kajidog)! - Add npm badges to package READMEs

- Updated dependencies [[`909dc5e`](https://github.com/kajidog/connpass-mcp-server/commit/909dc5e16430ff9fb1ff5da907ee1882a2d44fd7)]:
  - @kajidog/connpass-api-client@0.1.1
