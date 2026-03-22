# @kajidog/connpass-mcp-server

## 0.4.1

### Patch Changes

- [`2f5c8c0`](https://github.com/kajidog/connpass-mcp-server/commit/2f5c8c008329c3314ac6a40c43baed2b3b853e69) Thanks [@kajidog](https://github.com/kajidog)! - fix: search_events のテキストレスポンスにイベント ID・参加者数・キャッチフレーズ・グループ名・searchSessionId を含めるように改善

  - summarizeEventLine にイベント ID、参加者数(参加/待ち/定員)を追加
  - キャッチフレーズとグループ名を各イベントのサマリーに表示
  - 5 件制限を撤廃し検索結果の全件をサマリー表示
  - searchSessionId をテキストレスポンスに含め、browse_events を呼び出せるように修正

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

### Patch Changes

- Updated dependencies [[`e6aad57`](https://github.com/kajidog/connpass-mcp-server/commit/e6aad5793f53d73d4ee4e02999b1b0f47f5a000f)]:
  - @kajidog/connpass-api-client@0.4.0
