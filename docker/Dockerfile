FROM node:22-bookworm
# zip: itch.io package; ffmpeg: converting open audio clips (scripts/fetch-audio.mjs)
RUN apt-get update && apt-get install -y --no-install-recommends zip ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
