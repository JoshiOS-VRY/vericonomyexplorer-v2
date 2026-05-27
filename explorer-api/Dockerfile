FROM node:20-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libzmq3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install root deps first because explorer-api loads root modules at runtime.
COPY package.json package-lock.json npm-shrinkwrap.json ./
RUN npm ci

# Install explorer-api deps and build.
COPY explorer-api/package.json explorer-api/package-lock.json ./explorer-api/
RUN npm --prefix explorer-api ci

COPY . .
RUN npm --prefix explorer-api run build
RUN npm prune --omit=dev && npm --prefix explorer-api prune --omit=dev

FROM node:20-bookworm-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    libzmq5 \
    tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV VCEXP_FAST_API_HOST=0.0.0.0
ENV VCEXP_FAST_API_PORT=3003

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs fastapi

COPY --from=build --chown=fastapi:nodejs /app /app

USER fastapi
EXPOSE 3003
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "--prefix", "explorer-api", "run", "start"]
