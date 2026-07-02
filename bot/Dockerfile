FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

VOLUME ["/app/data"]
ENV DATABASE_URL="file:/app/data/prod.db"

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
