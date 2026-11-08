# ==============================================================================
# Étape 1 : Builder (Compilation du client Vite et du serveur Node.js)
# ==============================================================================
FROM node:26.13.0-alpine AS builder
WORKDIR /app
# Allocation mémoire V8 optimisée pour prévenir tout OOM pendant la compilation
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN mkdir -p /app/dist /app/build

# ==============================================================================
# Étape 2 : Production (Image légère, runtime optimisé sous Node 26.13.0)
# ==============================================================================
FROM node:26.13.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Plafond mémoire strict pour environnement conteneurisé (VPS / Render) évitant les crashs SIGKILL 137 OOM
ENV NODE_OPTIONS="--max-old-space-size=512"
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copie des artefacts compilés et des assets statiques
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build
COPY --from=builder /app/payment-service ./payment-service

# Ports réseau : Render utilise 10000 par défaut, les environnements locaux/VPS utilisent 3000
ENV PORT=10000
EXPOSE 10000
EXPOSE 3000

# Healthcheck natif Docker multi-ports (teste 10000 puis fallback 3000)
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:10000/health || wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "--max-old-space-size=512", "dist/server.cjs"]
