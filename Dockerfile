# Use Node.js from .nvmrc
ARG NODE_VERSION

# Prepare and cache pnpm
FROM node:${NODE_VERSION} AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json .
COPY pnpm-lock.yaml .
COPY tsconfig.json .
COPY src ./src

# Prepare and cache dependencies
FROM base AS dependencies
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --ignore-scripts --frozen-lockfile

# Prepare and cache build
FROM base AS build
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --ignore-scripts --frozen-lockfile
RUN pnpm run build

# Prepare and cache working app
FROM base AS final
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

ENV SERVICE_PATH="/api/websocket"
ENV REDIS_DATABASE_URL="redis://back-websocket-redis-service-cluster-ip:3000"

CMD [ "pnpm", "start" ]
