# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY server/ ./server/
COPY client/ ./client/

# Build shared package first
RUN npm run build:shared

# Build client (Vite)
RUN npm run build --workspace=@pileo/client

# Build server (TypeScript)
RUN npm run build --workspace=@pileo/server

# Stage 3: Production dependencies
FROM node:20-alpine AS prod-deps
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --omit=dev

# Stage 4: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S pileo && \
    adduser -S pileo -u 1001 -G pileo

# Copy production node_modules (with compiled native addons)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=prod-deps /app/server/node_modules ./server/node_modules

# Copy package.json files for module resolution
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Create data and upload directories
RUN mkdir -p /app/data /app/uploads && \
    chown -R pileo:pileo /app/data /app/uploads

USER pileo

ENV PILEO_NODE_ENV=production
ENV PILEO_PORT=3000
ENV PILEO_HOST=0.0.0.0
ENV PILEO_DB_PATH=/app/data/pileo.db
ENV PILEO_UPLOAD_DIR=/app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/dist/index.js"]
