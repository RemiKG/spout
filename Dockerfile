# ============================================================================
# Spout — production image for Alibaba Cloud ECS / Simple Application Server
# (Singapore, ap-southeast-1). Multi-stage → tiny standalone Next.js server.
# The eligibility-gate base URL lives in lib/qwen/client.ts; the key is injected
# at runtime via the DASHSCOPE_API_KEY env var (never baked into the image).
#
#   docker build -t spout .
#   docker run -p 8080:8080 --env-file .env.local spout
# ============================================================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S spout -u 1001
# standalone server + static assets + public (fonts, art, demo)
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# the MCP servers + their shared data (runnable inside the container too)
COPY --from=build /app/services ./services
COPY --from=build /app/lib/cancel-directory/directory.json ./lib/cancel-directory/directory.json
USER spout
EXPOSE 8080
CMD ["node", "server.js"]
