## Production Dockerfile for Next.js frontend (multi-stage)
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
# Ensure public directory exists so runner stage can copy it even if empty
RUN mkdir -p public
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

FROM node:20-alpine
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup
WORKDIR /app

# Copy built artifacts
COPY --from=builder --chown=appuser:appgroup /app/.next ./.next
COPY --from=builder --chown=appuser:appgroup /app/public ./public
COPY --from=builder --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

USER appuser
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
