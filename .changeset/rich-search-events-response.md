---
"@kajidog/connpass-mcp-server": patch
---

fix: search_events のテキストレスポンスにイベントID・参加者数・キャッチフレーズ・グループ名・searchSessionId を含めるように改善

- summarizeEventLine にイベントID、参加者数(参加/待ち/定員)を追加
- キャッチフレーズとグループ名を各イベントのサマリーに表示
- 5件制限を撤廃し検索結果の全件をサマリー表示
- searchSessionId をテキストレスポンスに含め、browse_events を呼び出せるように修正
