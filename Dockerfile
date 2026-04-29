# Stage 1: Build frontend
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN npm install --prefix backend --omit=dev
COPY backend/ ./backend/
COPY --from=builder /app/frontend/dist ./frontend/dist
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "backend/server.js"]
