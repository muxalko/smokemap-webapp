# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS dependencies

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM dependencies AS development

ENV AUTH_TRUST_HOST=true

COPY . .

EXPOSE 3000

CMD ["yarn", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
