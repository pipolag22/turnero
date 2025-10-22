# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# deps
COPY package*.json ./
RUN npm ci

# código
COPY . .

# Build Nest 

RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000


COPY package*.json ./
RUN npm ci --omit=dev

# Copiar build y prisma DESDE /app (no /api)
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Entrypoint: genera prisma y migra con las env ya cargadas
COPY docker-entrypoint.sh /docker-entrypoint.sh
# normalizar EOL por si el repo está en Windows
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
