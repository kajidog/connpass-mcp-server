# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Build all packages (order: api-client → mcp-core → connpass-ui → mcp-server)
pnpm build

# Type check all packages
pnpm typecheck

# Lint (Biome)
pnpm lint

# Run tests (skips packages without test scripts)
pnpm test

# Type check single package
npx tsc --noEmit -p apps/mcp-server/tsconfig.json

# Dev mode - MCP server (stdio)
pnpm --filter @kajidog/connpass-mcp-server dev

# Dev mode - MCP server (HTTP)
pnpm --filter @kajidog/connpass-mcp-server dev:http

# Dev mode - connpass-ui (Vite dev server)
pnpm --filter @kajidog/connpass-ui dev
```

## Architecture

pnpm monorepo with 4 packages:

```
apps/mcp-server          → MCP server (published as @kajidog/connpass-mcp-server)
  depends on: api-client (runtime), mcp-core (bundled via tsup), connpass-ui (HTML copied to dist)

packages/api-client      → Connpass API v2 client (published as @kajidog/connpass-api-client)
  standalone, CommonJS, clean architecture (domain/application/infrastructure)

packages/mcp-core        → MCP server infrastructure (private)
  provides: launchServer, HTTP/stdio transports, config parsing (Hono-based HTTP)

packages/connpass-ui     → Interactive React UI for MCP Apps Extension (private)
  builds to single-file HTML (mcp-app.html) via Vite + vite-plugin-singlefile
```

### MCP Server Tool Registration

All tools follow dependency injection via `ToolDeps = { server, connpassClient, config }`.

```
server.ts: createServer() → registerAllTools(deps)
  tools/index.ts → registerEventTools, registerGroupTools, registerUserTools, registerPrefectureTools
  tools/ui-tools/index.ts → registerUISearchTool, registerUIScheduleTool, registerUIEventDetailTool
```

- **Public tools** (AI-facing): `search_events`, `browse_events`, `get_event_detail`, `get_event_presentations`, `search_schedule`, `search_groups`, `search_users`, `get_user_*`
- **UI tools** (internal, prefixed `_`): `_search_events`, `_search_schedule`, `_get_event_detail`, `_get_prefectures` — only callable from the embedded UI
- **Utility code** lives in `tools/utils/` (formatting, shared, types, registration, resource)

### Key Patterns

- `registerAppToolIfEnabled()` wraps MCP Apps Extension's `registerAppTool`
- Tool input schemas use Zod v4. Each tool handler parses `args` with `.parse(args ?? {})`
- `FORMAT_PRESETS` in `utils/formatting.ts` controls AI response detail level (`default` / `detailed` / `full`)
- `includeDetails: boolean` parameter on search tools toggles between `default` and `detailed` presets
- Config resolution: CLI args > env vars > defaults (declarative `ConfigDefs` system in mcp-core)

### Build Details

- **apps/mcp-server**: tsup bundles ESM, `noExternal: ['@kajidog/mcp-core']` (mcp-core is inlined), api-client stays external. `onSuccess` copies connpass-ui's `mcp-app.html` into dist
- **packages/api-client**: `tsc -b` with `composite: true` (CommonJS output)
- **packages/mcp-core**: `tsc` (ESM output)
- **packages/connpass-ui**: Vite → single-file HTML with React 19 + Tailwind CSS 4

### Module Types

- apps/mcp-server: ESM (`"type": "module"`, `.js` imports need explicit extensions)
- packages/api-client: CommonJS
- packages/mcp-core: ESM
- packages/connpass-ui: ESM
