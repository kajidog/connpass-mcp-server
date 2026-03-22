---
"@kajidog/connpass-mcp-server": minor
"@kajidog/connpass-api-client": minor
---

feat: MCP Apps Extension への移行とツール改善

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
