# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d

FROM ${NODE_IMAGE} AS dependencies

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json yarn.lock ./
RUN node --version | grep -Fx 'v22.23.4' \
    && yarn --version | grep -Fx '1.22.22' \
    && yarn install --frozen-lockfile --non-interactive \
    && yarn cache clean

FROM dependencies AS development

ENV AUTH_TRUST_HOST=true

COPY . .

EXPOSE 3000

CMD ["yarn", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM dependencies AS build

ARG VCS_REF
ARG NEXT_PUBLIC_ENVIRONMENT
ARG NEXT_PUBLIC_VERSION
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_BACKEND
ARG NEXT_PUBLIC_GRAPHQL_ENDPOINT
ARG NEXT_PUBLIC_FEATURESERV_ENDPOINT
ARG NEXT_PUBLIC_MAP_STYLE
ARG NEXT_PUBLIC_LOG_LEVEL

ENV VCS_REF=${VCS_REF} \
    NEXT_PUBLIC_ENVIRONMENT=${NEXT_PUBLIC_ENVIRONMENT} \
    NEXT_PUBLIC_VERSION=${NEXT_PUBLIC_VERSION} \
    NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL} \
    NEXT_PUBLIC_BACKEND=${NEXT_PUBLIC_BACKEND} \
    NEXT_PUBLIC_GRAPHQL_ENDPOINT=${NEXT_PUBLIC_GRAPHQL_ENDPOINT} \
    NEXT_PUBLIC_FEATURESERV_ENDPOINT=${NEXT_PUBLIC_FEATURESERV_ENDPOINT} \
    NEXT_PUBLIC_MAP_STYLE=${NEXT_PUBLIC_MAP_STYLE} \
    NEXT_PUBLIC_LOG_LEVEL=${NEXT_PUBLIC_LOG_LEVEL}

COPY . .
RUN node src/lib/production-config.js validate-build /tmp/production-build.json \
    && yarn build

FROM ${NODE_IMAGE} AS production

ARG VCS_REF

LABEL org.opencontainers.image.source="https://github.com/muxalko/smokemap-webapp" \
      org.opencontainers.image.revision="${VCS_REF}"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN groupadd --system --gid 10001 smokemap \
    && useradd --system --uid 10001 --gid 10001 --home-dir /app \
      --shell /usr/sbin/nologin smokemap

COPY --from=build --chown=10001:10001 /app/.next/standalone ./
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/static
COPY --from=build --chown=10001:10001 /app/public ./public
COPY --from=build --chown=10001:10001 /tmp/production-build.json ./production-build.json
COPY --chown=10001:10001 docker/production-package.json ./package.json
COPY --chown=10001:10001 docker/start-production.js ./runtime/start-production.js
COPY --chown=10001:10001 src/lib/production-config.js ./runtime/production-config.js

USER 10001:10001

EXPOSE 3000

CMD ["yarn", "start", "--hostname", "0.0.0.0", "--port", "3000"]
