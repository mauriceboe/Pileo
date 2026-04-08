FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

COPY packages/ ./packages/
COPY server/ ./server/
COPY client/ ./client/

RUN npm run build:shared
RUN npm run build --workspace=@pileo/client
RUN cd server && npx tsc --composite false

# Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci --omit=dev

RUN addgroup -g 1001 -S pileo && \
    adduser -S pileo -u 1001 -G pileo

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data /app/uploads && \
    chown -R pileo:pileo /app/data /app/uploads

USER pileo

ENV PILEO_NODE_ENV=production
ENV PILEO_PORT=3003
ENV PILEO_HOST=0.0.0.0
ENV PILEO_DB_PATH=/app/data/pileo.db
ENV PILEO_UPLOAD_DIR=/app/uploads

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3003/api/health || exit 1

CMD ["node", "server/dist/index.js"]
