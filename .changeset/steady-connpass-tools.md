---
"@kajidog/connpass-api-client": minor
"@kajidog/connpass-mcp-server": minor
---

Improve connpass API v2 compatibility and user resolution across the client and MCP server.

The API client now expands date ranges into repeated `ymd` query parameters for shorter ranges, falls back to `ym` month queries for wider ranges, and preserves multi-value `ymd` filters as repeated query parameters instead of comma-joined values.

The MCP server now supports nickname-based user references for user and schedule tools, adds MCP tool annotations, supports disabling specific tools with `CONNPASS_DISABLE_TOOLS` / `--disable-tools`, and returns structured tool errors for validation, API, timeout, and rate-limit failures.
