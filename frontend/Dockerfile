# ── Stage 1: Build ───────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# ── Stage 2: Serve with Nginx ────────────────────────────
FROM nginx:alpine AS production

RUN apk upgrade --no-cache && apk add --no-cache jq

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback config (all routes → index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /usr/local/bin/just-easy-entrypoint
RUN chmod +x /usr/local/bin/just-easy-entrypoint

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/healthz || exit 1

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/just-easy-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
