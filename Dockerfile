# Stage 1: Build frontend
FROM node:20-slim AS builder
WORKDIR /app

# Copy root package for potentially shared dependencies or config
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install frontend dependencies and build
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Stage 2: Production
FROM node:20-slim
WORKDIR /app

# Install only production dependencies for backend
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run in production mode
ENV NODE_ENV=production

# Start server
CMD ["node", "backend/server.js"]
