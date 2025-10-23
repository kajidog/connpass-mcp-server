---
"@kajidog/connpass-api-client": minor
---

Add pluggable cache support and Cloudflare Workers deployment option

This release adds support for custom cache implementations, enabling deployment to Cloudflare Workers and other serverless platforms.

**API Client Changes:**
- Add `IPresentationCache` interface for pluggable cache implementations
- Support custom cache injection via `presentationCache` config option
- Maintain backward compatibility with file-based cache

**Cloudflare Workers Support (packages/cloudflare-worker):**
A new reference implementation for deploying to Cloudflare Workers is now available in the repository:
- KV-based presentation cache for Cloudflare Workers
- HTTP transport mode for Workers compatibility
- Comprehensive deployment documentation
- Environment variable configuration support

Note: The Workers package (`@kajidog/connpass-mcp-worker`) is not published to npm as it's meant to be cloned and customized for your own Cloudflare account.
