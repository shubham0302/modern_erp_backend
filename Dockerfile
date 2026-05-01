# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY proto ./proto
COPY apps ./apps
COPY libs ./libs
COPY db ./db
COPY scripts ./scripts

RUN npx nest build gateway \
 && npx nest build admin \
 && npx nest build staff \
 && npx nest build inventory


FROM builder AS prod-deps
RUN npm prune --omit=dev


FROM node:20-alpine AS runtime
WORKDIR /app

ARG SERVICE
ENV SERVICE=${SERVICE} \
    NODE_ENV=production

RUN apk add --no-cache tini \
 && addgroup -S app \
 && adduser -S app -G app

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/proto ./proto
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node dist/apps/${SERVICE}/apps/${SERVICE}/src/main.js"]
