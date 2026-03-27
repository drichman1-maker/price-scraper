FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built app
COPY dist ./dist
COPY server.cjs ./

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.cjs"]