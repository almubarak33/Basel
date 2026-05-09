FROM python:3.11-slim

WORKDIR /app

# System deps: ffmpeg for video processing, libpq for postgres
RUN apt-get update && apt-get install -y \
    libpq-dev gcc ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Directories created at build time so volumes can mount correctly
RUN mkdir -p /app/staticfiles /app/media

EXPOSE 8000
