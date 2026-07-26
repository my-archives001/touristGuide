# Enterprise Production Dockerfile for Node.js Express Backend
FROM node:20-alpine

# Security & environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Create application directory
WORKDIR /usr/src/app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY . .

# Ensure logs folder exists and set correct permissions for non-root user
RUN mkdir -p logs && chown -R node:node /usr/src/app

# Drop root privileges for enhanced container security
USER node

# Expose backend service port
EXPOSE 5000

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ping || exit 1

# Start the Express production server
CMD ["node", "server.js"]
