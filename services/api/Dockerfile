FROM node:22-alpine AS base

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma

RUN npm install

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]