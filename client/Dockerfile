FROM node:20-alpine AS builder
WORKDIR /app

# Копируем корневые файлы монорепозитория
COPY package*.json ./
COPY client/package*.json ./client/

# Устанавливаем зависимости
RUN npm ci

# Копируем исходники клиента и собираем
COPY client ./client
WORKDIR /app/client
RUN npm run build

# Раздача Nginx
FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]