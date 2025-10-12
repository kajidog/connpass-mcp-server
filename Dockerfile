FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package files
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/api-client ./packages/api-client
COPY packages/mcp-server ./packages/mcp-server

# Build all packages
RUN pnpm build

# Production stage
FROM node:18-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built artifacts and dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./

# Create data directory for cache
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "@kajidog/connpass-mcp-server", "start"]
