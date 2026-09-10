# Base image with Bun
FROM oven/bun:1-alpine
WORKDIR /code

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy project source
COPY . .

# Build application
ARG A0_RELAY_URL=/search-relay/
ENV A0_RELAY_URL=$A0_RELAY_URL
RUN bun run build

EXPOSE 19985 8080
CMD ["bun", "run", "serve"]
