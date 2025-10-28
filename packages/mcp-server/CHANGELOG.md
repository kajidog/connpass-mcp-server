# @kajidog/connpass-mcp-server

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
