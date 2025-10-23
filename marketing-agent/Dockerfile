FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY mcp-servers/ga4/package*.json ./mcp-servers/ga4/
COPY mcp-servers/google-ads/package*.json ./mcp-servers/google-ads/

# Install dependencies
RUN npm install --production=false
RUN cd mcp-servers/ga4 && npm install --production=false
RUN cd mcp-servers/google-ads && npm install --production=false

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src
COPY mcp-servers ./mcp-servers

# Build the application
RUN npm run build
RUN cd mcp-servers/ga4 && npm run build
RUN cd mcp-servers/google-ads && npm run build

# Remove dev dependencies
RUN npm prune --production
RUN cd mcp-servers/ga4 && npm prune --production
RUN cd mcp-servers/google-ads && npm prune --production

# Create directories for credentials and logs
RUN mkdir -p /app/credentials /app/logs

# Expose port (default for Google Chat)
EXPOSE 8080

# Default command (can be overridden)
CMD ["node", "dist/index.js"]
