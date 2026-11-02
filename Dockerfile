# 1. Étape de build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# 2. Étape de production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --production --legacy-peer-deps
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]