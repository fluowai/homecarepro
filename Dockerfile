# ===== Build Stage =====
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

# ===== Production Stage =====
FROM node:22-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server.cjs"]
