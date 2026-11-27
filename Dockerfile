# ==============================================================================
# Étape 1 : Builder (Compilation du client Vite et du serveur Node.js)
# ==============================================================================
FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
RUN mkdir -p /app/dist /app/build

# ==============================================================================
# Étape 2 : Production (Image légère, utilisateur non-root)
# ==============================================================================
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg
ENV NODE_OPTIONS="--max-old-space-size=220"

COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Copie des artefacts compilés et des assets statiques
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/build ./build
COPY --from=builder /app/payment-service ./payment-service

# Installation des dépendances production de payment-service (pour fixie-proxy & modules partagés)
RUN cd /app/payment-service && npm install --omit=dev

# Permissions et passage en utilisateur non-root
RUN chown -R node:node /app
USER node

ENV PORT=10000
ENV PAYMENT_API_URL=http://127.0.0.1:10001
EXPOSE 10000
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD (wget --no-verbose --tries=1 --spider http://127.0.0.1:10000/health || wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health) && wget --no-verbose --tries=1 --spider http://127.0.0.1:10001/health || exit 1

CMD ["sh", "-c", "(while true; do PORT=10001 node --max-old-space-size=160 /app/payment-service/server.js; echo '[SUPERVISOR] payment-service exited, restarting in 2s...'; sleep 2; done) & exec node --max-old-space-size=256 dist/server.cjs"]
