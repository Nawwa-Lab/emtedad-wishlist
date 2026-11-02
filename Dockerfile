# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS base
WORKDIR /app
FROM base AS development
ENV NODE_ENV=development
COPY package.json bun.lock nest-cli.json tsconfig*.json ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 4007
CMD ["bunx", "nest", "start", "--watch"]
FROM base AS builder
ENV NODE_ENV=production
COPY package.json bun.lock nest-cli.json tsconfig*.json ./
RUN bun install --frozen-lockfile
COPY . .
RUN bunx nest build
FROM oven/bun:1-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 4007
CMD ["bun", "dist/main"]
