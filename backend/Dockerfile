# ── Stage 1: Build ───────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

# Copy package files first (better cache)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/

# Install ALL deps (need devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy prisma schema & generate client
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source & build
COPY tsconfig.json ./
# Cache-bust arg to force rebuild of the source layer when code changes.
ARG CACHEBUST=0
COPY src/ ./src/
RUN pnpm build

# Prune development dependencies in-place.
RUN pnpm prune --prod

# ── Stage 2: Production ─────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# The API runtime does not need npm/npx. Removing the bundled package manager
# reduces the production attack surface and avoids shipping its transitive tools.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy pruned production node_modules.
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./

# Copy prisma schema + generated client from builder
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY seed.js ./seed.js
COPY seed-demo.js ./seed-demo.js
COPY --from=builder /app/generated/ ./generated/

# Ensure Node can resolve "@generated/prisma/client" in production
RUN mkdir -p node_modules/@generated \
  && ln -s /app/generated/prisma node_modules/@generated/prisma

# Copy built JS from builder
COPY --from=builder /app/dist/ ./dist/

# Startup script: run migrations, then start the server.
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health/ready || exit 1

EXPOSE 4000

USER node
CMD ["./docker-entrypoint.sh"]
