# Production Dockerfile for TEAstream Cloud Relay
FROM node:22-bookworm-slim

# Install latest FFmpeg with full H.264/AAC support
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Create volume mount point for persistent configuration
RUN mkdir -p /app/data

# Ports:
# 1935: RTMP Ingest from OBS
# 3000: Upstream-style Web Dashboard & WebSockets
# 8000: HTTP-FLV Live Preview
EXPOSE 1935 3000 8000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
