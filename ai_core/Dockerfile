FROM python:3.11-slim

WORKDIR /app

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

COPY ./requirements.txt /app/requirements.txt

# Use latest packaging tools to prefer wheels where available
RUN pip install --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
