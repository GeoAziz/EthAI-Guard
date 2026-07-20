FROM python:3.11-slim AS builder
WORKDIR /app/ai_core
ENV PYTHONPATH=/app

# Install system build deps needed to compile scientific packages
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		build-essential \
		gfortran \
		libgomp1 \
		libopenblas-dev \
		liblapack-dev \
		pkg-config && \
	rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/ai_core/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r /app/ai_core/requirements.txt
COPY . /app/ai_core
RUN pip install --no-cache-dir -e /app/ai_core

# Production stage — no build tools, no git, no compilers
FROM python:3.11-slim
RUN addgroup --gid 1001 appgroup && adduser --uid 1001 --gid 1001 --disabled-password --gecos "" appuser
WORKDIR /app/ai_core
ENV PYTHONPATH=/app

# Copy only installed packages and app code from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

USER appuser
EXPOSE 8100
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
