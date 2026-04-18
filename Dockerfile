FROM node:20-alpine

WORKDIR /app

# Instalar dependencias nativas para bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY src ./src/

EXPOSE 3000

# Aplica migraciones y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
