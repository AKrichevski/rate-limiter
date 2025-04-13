FROM node:18-alpine AS base

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code using the production-specific tsconfig
RUN npm run build:prod

# Runtime stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built app
COPY --from=base /app/dist ./dist
COPY --from=base /app/src/lua ./dist/lua

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O- http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Run the app
CMD ["node", "dist/app.js"]

# Development stage (for local development with hot reloading)
FROM base AS development

# Install development dependencies (already done in base)
# This stage is used for local development with volume mounts

# Run the app in development mode
CMD ["npm", "run", "dev"]
