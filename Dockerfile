# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /build
COPY . .
RUN npm ci --prefix SwettyPuppies_Frontend --include=dev
RUN npm run build
RUN node scripts/prepare-release.cjs /runtime

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /runtime/ ./
RUN npm ci --omit=dev
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-production.cjs"]
