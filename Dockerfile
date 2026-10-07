FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --include=optional --no-audit --no-fund
COPY . .
ENV PARAGON_RUNTIME=railway NODE_ENV=production
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PARAGON_RUNTIME=railway PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/lib/railway ./lib/railway
COPY --from=build /app/scripts/railway-start.mjs ./scripts/railway-start.mjs
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "scripts/railway-start.mjs"]
