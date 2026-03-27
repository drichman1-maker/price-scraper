FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (need dev deps for build)
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.cjs"]