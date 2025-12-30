# Use Node 24 LTS
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port 
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
