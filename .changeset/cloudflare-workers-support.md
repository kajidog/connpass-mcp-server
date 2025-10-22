---
"@kajidog/connpass-api-client": minor
"@kajidog/connpass-mcp-worker": minor
---

Add Cloudflare Workers support for serverless deployment

This release adds support for deploying the Connpass MCP Server to Cloudflare Workers, enabling serverless deployment at the edge.

**New Package:**
- `@kajidog/connpass-mcp-worker`: Cloudflare Workers adapter for MCP server

**API Client Changes:**
- Add `IPresentationCache` interface for pluggable cache implementations
- Support custom cache injection via `presentationCache` config option
- Maintain backward compatibility with file-based cache

**Features:**
- KV-based presentation cache for Cloudflare Workers
- HTTP transport mode for Workers compatibility
- Comprehensive deployment documentation
- Environment variable configuration support

**Benefits:**
- Global edge deployment with low latency
- Serverless infrastructure (no server management)
- Free tier: 100,000 requests/day
- Persistent caching with Cloudflare KV
