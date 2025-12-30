# Use Node 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install ts-node for production (needed for start script)
RUN npm install -g ts-node typescript

# Copy source code
COPY . .

# Expose port (Cloud Run will use PORT env variable)
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
