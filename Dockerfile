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
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.cjs"]
