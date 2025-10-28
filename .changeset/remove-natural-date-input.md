---
"@kajidog/connpass-mcp-server": minor
---

**BREAKING CHANGE**: 自然言語による日付入力のサポートを削除しました。

日付パラメータ（`on`, `from`, `to`）は、YYYY-MM-DD または YYYYMMDD フォーマットのみを受け付けるようになりました。

以前サポートされていた以下の表現は使用できなくなります：
- `today`, `tomorrow`, `yesterday` などの相対日付キーワード
- `Date.parse()` で解析可能な自然言語表現（例: `next Monday`）

**移行ガイド:**
- `today` → 現在の日付を YYYY-MM-DD 形式で指定（例: `2025-10-28`）
- `tomorrow` → 翌日の日付を YYYY-MM-DD 形式で指定（例: `2025-10-29`）
- `next Monday` → 具体的な日付を YYYY-MM-DD 形式で指定（例: `2025-11-03`）
