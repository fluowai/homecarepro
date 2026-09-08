# ===== Build Stage =====
FROM node:22-alpine AS builder

WORKDIR /app

# Build-time overrides (optional). When empty, the committed .env.production is used.
ARG VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
ARG VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"
ARG VITE_PUBLIC_VAPID_KEY="${VITE_PUBLIC_VAPID_KEY}"
ARG VITE_ENABLE_DEMO_MODE=false
ARG VITE_APP_BASE_DOMAIN=homecare.wootech.com.br
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_PUBLIC_VAPID_KEY=${VITE_PUBLIC_VAPID_KEY}
ENV VITE_ENABLE_DEMO_MODE=${VITE_ENABLE_DEMO_MODE}
ENV VITE_APP_BASE_DOMAIN=${VITE_APP_BASE_DOMAIN}

COPY package.json package-lock.json* bun.lock* ./
RUN npm install

COPY . .

# Build with production mode so Vite loads .env.production as the base of truth.
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
