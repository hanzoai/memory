# Multi-stage build for cross-platform support
FROM node:20-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm@8

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the project
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

RUN apk add --no-cache tini

WORKDIR /app

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Create data directory
RUN mkdir -p /app/data/lancedb

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["node", "dist/server.js"]

# Expose port
EXPOSE 8000

# Test stage for CI
FROM base AS test

# Install additional test dependencies
RUN apk add --no-cache bash

# Run tests
CMD ["pnpm", "test"]

# Benchmark stage
FROM base AS benchmark

# Install benchmark dependencies
RUN apk add --no-cache bash wget

# Download test models for benchmarks
RUN mkdir -p /app/models

# Run benchmarks
CMD ["pnpm", "bench"]

# Development stage
FROM base AS development

# Install dev tools
RUN apk add --no-cache bash vim

# Start in dev mode
CMD ["pnpm", "dev"]