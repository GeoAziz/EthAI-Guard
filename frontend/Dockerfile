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

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy node_modules produced by the builder so we don't rely on a lockfile at runtime
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
