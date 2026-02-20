# Frontend Dockerfile - Build and output to volume
FROM node:20-alpine as build

WORKDIR /app

# Install dependencies cleanly
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy all source code
COPY . .

# Build the app (Vite/React)
RUN npm run build

# Final stage - just the built files
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist ./dist
# Copy build files to shared volume and keep container running
CMD sh -c "cp -r /app/dist/* /shared/ 2>/dev/null || true; while true; do sleep 3600; done"
