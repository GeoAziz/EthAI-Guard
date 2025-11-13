FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm ci --silent
COPY . /app
CMD ["node", "src/server.js"]
FROM python:3.11-slim
WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY . /app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
