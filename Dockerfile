FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/mcp-core/package.json ./packages/mcp-core/
COPY packages/connpass-ui/package.json ./packages/connpass-ui/
COPY apps/mcp-server/package.json ./apps/mcp-server/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source files (only packages used by mcp-server)
COPY packages/api-client/ ./packages/api-client/
COPY packages/mcp-core/ ./packages/mcp-core/
COPY packages/connpass-ui/ ./packages/connpass-ui/
COPY apps/mcp-server/ ./apps/mcp-server/

# Build all packages
RUN pnpm --filter @kajidog/connpass-mcp-server... build

# ---- Production ----
FROM node:18-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/api-client ./packages/api-client
COPY --from=base /app/packages/mcp-core ./packages/mcp-core
COPY --from=base /app/packages/connpass-ui ./packages/connpass-ui
COPY --from=base /app/apps/mcp-server ./apps/mcp-server
COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./

EXPOSE 3000

ENV NODE_ENV=production
ENV MCP_HTTP_MODE=true

CMD ["pnpm", "--filter", "@kajidog/connpass-mcp-server", "start"]
