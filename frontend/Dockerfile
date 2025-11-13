## Production Dockerfile for Next.js frontend (multi-stage)
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Install production deps
RUN npm ci --production=true

EXPOSE 3000
CMD ["npm", "start"]
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm ci --silent
COPY . /app
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
