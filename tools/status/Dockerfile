FROM node:18-alpine
WORKDIR /usr/src/app
COPY worker.js /usr/src/app/worker.js
COPY ../../public/demo-status.json /usr/src/app/demo-status.json

ENV INTERVAL_MS=30000

CMD ["node", "worker.js"]
