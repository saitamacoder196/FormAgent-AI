FROM node:18

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
COPY docs ./docs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]