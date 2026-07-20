FROM node:20-alpine AS base

# Dependencias necesarias para Prisma en Alpine y node-gyp
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Instalar dependencias
COPY package.json package-lock.json ./
RUN npm ci

# Generar Prisma y compilar Next.js
COPY . .
RUN npx prisma generate
RUN npm run build

# Imagen final
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV production

COPY --from=base /app/public ./public
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/prisma ./prisma

EXPOSE 3000

ENV PORT 3000

# El comando inicia la aplicación. NOTA: Para producción con MySQL se recomienda
# correr "npx prisma db push" en el servidor o durante un script de inicio,
# pero dado que Next.js standalone no incluye las CLI globales por defecto, 
# se asume que la estructura DB ya fue aplicada centralmente o se correrá remotamente.
CMD ["node", "server.js"]
