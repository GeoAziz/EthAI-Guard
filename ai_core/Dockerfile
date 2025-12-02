FROM python:3.11-slim

# Place the project under /app/ai_core so the package directory `ai_core/` is
# preserved when copying the build context. This makes `import ai_core` work
# inside the container (tests expect a package named `ai_core`).
WORKDIR /app/ai_core
ENV PYTHONPATH=/app

# Install system build deps needed to compile scientific packages (numpy/scipy/numba/shap)
# Keep the installed set minimal to reduce image size.
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
		build-essential \
		gfortran \
		git \
		ca-certificates \
		libgomp1 \
		libopenblas-dev \
		liblapack-dev \
		pkg-config && \
	rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /app/ai_core/requirements.txt

# Use latest packaging tools to prefer wheels where available
RUN pip install --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r /app/ai_core/requirements.txt

COPY . /app/ai_core

# Install the package in editable mode so tests and runtime can import `ai_core`
# even when the working directory or sys.path differs in CI/container runs.
RUN pip install --no-cache-dir -e /app/ai_core

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
