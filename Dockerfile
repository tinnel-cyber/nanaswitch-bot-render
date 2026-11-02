# ==============================================================================
# Étape 1 : Builder (Compilation du client Vite et du serveur Node.js)
# ==============================================================================
FROM node:26.13.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN mkdir -p /app/build

# ==============================================================================
# Étape 2 : Production (Image légère, runtime optimisé sous Node 26.13.0)
# ==============================================================================
FROM node:26.13.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copie des artefacts compilés et des assets statiques
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
