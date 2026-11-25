FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/ ./shared/

# Install dependencies
RUN npm install

# Copy server source
COPY server/ ./server/

# Build TypeScript
RUN npm --workspace=server run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
COPY server/package*.json ./server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared ./shared

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
