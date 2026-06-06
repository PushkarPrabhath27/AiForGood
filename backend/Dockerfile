FROM python:3.11-slim

# Enforce stdin/stdout logs to stream directly
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system compiler tools and Prophet/OR-Tools runtime dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libpq-dev \
    libgomp1 \
    cmake \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend codebase
COPY . .

# Execute database migrations then start FastAPI server on port 8080 (App Runner default)
CMD ["sh", "-c", "alembic upgrade head && uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
