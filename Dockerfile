# Multi-stage build for Verium RPC Explorer
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY npm-shrinkwrap.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S verium -u 1001

# Change ownership of the app directory
RUN chown -R verium:nodejs /app

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache git curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S verium -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=verium:nodejs /app .

# Create cache directory
RUN mkdir -p /app/cache && chown -R verium:nodejs /app/cache

# Set environment variables for Verium
ENV NODE_ENV=production
ENV BTCEXP_COIN=VRM
ENV BTCEXP_HOST=0.0.0.0
ENV BTCEXP_PORT=3003
ENV BTCEXP_DISPLAY_CURRENCY=vrm
ENV BTCEXP_UI_THEME=dark
ENV BTCEXP_SLOW_DEVICE_MODE=false

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/ || exit 1

# Switch to non-root user
USER verium

# Expose port
EXPOSE 3003

# Start the application
CMD ["npm", "start"]
