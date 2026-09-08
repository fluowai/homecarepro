# ===== Build Stage =====
FROM node:22-alpine AS builder

WORKDIR /app

# Optional build-time overrides (GitHub Actions secrets or manual docker build --build-arg).
# The committed .env.production is always loaded by Vite in production mode.
# Build args override the .env.production values ONLY when non-empty.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_PUBLIC_VAPID_KEY
ARG VITE_ENABLE_DEMO_MODE
ARG VITE_APP_BASE_DOMAIN

COPY package.json package-lock.json* bun.lock* ./
RUN npm install

COPY . .

# Inject non-empty build args into .env.production so Vite picks them up.
RUN set -eux; \
    { \
      [ -n "$VITE_SUPABASE_URL" ] && echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL"; \
      [ -n "$VITE_SUPABASE_ANON_KEY" ] && echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY"; \
      [ -n "$VITE_PUBLIC_VAPID_KEY" ] && echo "VITE_PUBLIC_VAPID_KEY=$VITE_PUBLIC_VAPID_KEY"; \
      [ -n "$VITE_ENABLE_DEMO_MODE" ] && echo "VITE_ENABLE_DEMO_MODE=$VITE_ENABLE_DEMO_MODE"; \
      [ -n "$VITE_APP_BASE_DOMAIN" ] && echo "VITE_APP_BASE_DOMAIN=$VITE_APP_BASE_DOMAIN"; \
    } >> .env.production 2>/dev/null || true

RUN npm run build

# ===== Production Stage =====
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package.json package-lock.json* ./
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env.production .env

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
