FROM node:25-alpine AS builder


WORKDIR /app


COPY package*.json ./
COPY prisma ./prisma/


RUN npm install

COPY . .

ARG POSTGRES_URL="postgresql://dummy:***@localhost:5432/dummy"
ENV POSTGRES_URL=$POSTGRES_URL

RUN npx prisma generate

RUN npm run build

FROM node:25-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/.env ./.env

EXPOSE 3100

CMD [  "npm", "run", "start:migrate:prod" ]
