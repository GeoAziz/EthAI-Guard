FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm ci --silent
COPY . /app

FROM node:20-alpine
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/src ./src
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
USER appuser
EXPOSE 5000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
