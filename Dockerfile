FROM node:18

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application in dev mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]