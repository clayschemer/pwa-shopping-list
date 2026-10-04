FROM node:20-bookworm-slim

WORKDIR /app

# playwright install --with-deps handles its own apt packages,
# but needs curl available for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

# Install Chromium and all required system libraries
RUN npx playwright install --with-deps chromium

COPY tsconfig.json ./
COPY src ./src

CMD ["npx", "tsx", "src/index.ts", "--help"]
