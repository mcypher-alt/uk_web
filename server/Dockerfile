FROM node:20-alpine AS builder
WORKDIR /app

# Копируем корневые файлы монорепозитория
COPY package*.json ./
# Копируем package.json сервера и схему prisma
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

# Устанавливаем зависимости с учетом воркспейсов
RUN npm ci

# Копируем весь исходный код
COPY tsconfig*.json ./
COPY server ./server

WORKDIR /app/server
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --only=production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/node_modules/.prisma ./server/node_modules/.prisma

WORKDIR /app/server
EXPOSE 5000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]