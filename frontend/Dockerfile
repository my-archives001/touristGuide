# Multi-stage Dockerfile for React 18 Production Frontend
# Stage 1: Build static bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for build caching
COPY package*.json ./

# Install all dependencies required for bundling
RUN npm ci

# Copy application source code
COPY . .

# Pass build-time environment variables for React API base URLs
ARG REACT_APP_API_URL=/api
ARG REACT_APP_AI_URL=/ai
ARG REACT_APP_ROUTE_URL=/route
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_AI_URL=$REACT_APP_AI_URL
ENV REACT_APP_ROUTE_URL=$REACT_APP_ROUTE_URL

# Execute React production build
RUN npm run build

# Stage 2: Serve static production assets with Nginx
FROM nginx:alpine AS runner

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy React build artifacts from stage 1
COPY --from=builder /app/build /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# Start Nginx server in foreground
CMD ["nginx", "-g", "daemon off;"]
