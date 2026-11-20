FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV PORT=10000

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chown -R node:node /app
USER node

EXPOSE 10000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:10000/health || exit 1

CMD ["node", "--max-old-space-size=512", "server.js"]
