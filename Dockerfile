# 1. Étape de build avec Node 26.13.0
FROM node:26.13.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# 2. Étape de production avec Node 26.13.0
FROM node:26.13.0-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
# On utilise npm install complet pour garder les dépendances nécessaires au serveur
RUN npm install --legacy-peer-deps

# Copie des fichiers générés dans dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "dist/server.cjs"]