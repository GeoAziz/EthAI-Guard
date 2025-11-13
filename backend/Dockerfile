FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm ci --silent
COPY . /app
EXPOSE 5000
CMD ["node", "src/server.js"]
