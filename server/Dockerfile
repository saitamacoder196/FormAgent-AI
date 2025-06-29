FROM node:18-alpine

WORKDIR /app

# Copy package files first
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy only necessary source files
COPY server.js ./
COPY healthcheck.js ./
COPY config ./config
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY agents ./agents
COPY utils ./utils
COPY docs ./docs

# Run as node user (already exists in node:18 image)
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]