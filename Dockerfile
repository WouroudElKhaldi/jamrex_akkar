# ---- deps ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# ---- build ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# a dummy AUTH_SECRET / DATABASE_URL is enough for `next build` (real values come at runtime)
ENV NEXT_TELEMETRY_DISABLED=1 DATABASE_URL="postgresql://x:x@localhost:5432/x" AUTH_SECRET="build-time-placeholder-secret-value"
RUN npm run build

# ---- run ----
FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# prisma CLI + schema for `migrate deploy` and the seed/import scripts
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
# never run the web server as root: uploads live in a folder owned by the unprivileged "node" user
RUN mkdir -p /data/uploads && chown -R node:node /data /app
VOLUME ["/data/uploads"]
ENV UPLOAD_DIR=/data/uploads
USER node
EXPOSE 3000
# Uses migration files when they exist (created with `npm run db:migrate`), otherwise creates the tables from schema.prisma
CMD ["sh", "-c", "if [ -d prisma/migrations ]; then npx prisma migrate deploy; else npx prisma db push --skip-generate; fi && node server.js"]
