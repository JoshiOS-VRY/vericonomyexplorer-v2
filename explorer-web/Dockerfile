FROM node:20-alpine AS deps

WORKDIR /app

# explorer-web depends on the root package via file:..
COPY package.json npm-shrinkwrap.json ./
COPY packages/network-metrics /packages/network-metrics
COPY explorer-web/package.json explorer-web/package-lock.json ./explorer-web/

WORKDIR /app/explorer-web
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json npm-shrinkwrap.json ./
COPY explorer-web ./explorer-web
COPY packages/network-metrics /packages/network-metrics
COPY --from=deps /app/explorer-web/node_modules ./explorer-web/node_modules

WORKDIR /app/explorer-web
ENV NEXT_TELEMETRY_DISABLED=1
ARG EXPLORER_FAST_API_URL=http://explorer-fast-api:3003
ARG EXPLORER_API_URL=http://explorer-express:3002
ENV EXPLORER_FAST_API_URL=${EXPLORER_FAST_API_URL}
ENV EXPLORER_API_URL=${EXPLORER_API_URL}
ENV VCEXP_FAST_API_HOST=explorer-fast-api
ENV VCEXP_FAST_API_PORT=3003
ENV BTCEXP_HOST=explorer-express
ENV BTCEXP_PORT=3002
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# outputFileTracingRoot points at the monorepo root (standalone under app/explorer-web with Next 16)
COPY --from=builder /app/explorer-web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/explorer-web/.next/standalone/explorer-web ./
COPY --from=builder --chown=nextjs:nodejs /app/explorer-web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
