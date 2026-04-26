FROM node:20-alpine AS base

# ──────────────────────────────────────────────
# Stage 1: Install dependencies
# ──────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# ──────────────────────────────────────────────
# Stage 2: Build the application
# ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars must be present at build time to be embedded in the client bundle.
# Pass them via --build-arg or docker-compose build.args.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Provide placeholder values so static pages can pre-render without crashing.
# Real values are injected at runtime via env_file in docker-compose.
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder-anon-key}
ENV NEXT_TELEMETRY_DISABLED=1

# Verify GraphML data file is present (required for GraphRAG)
RUN test -f public/data/cbse_classx_knowledge_graph_2025_26.graphml || \
    (echo "ERROR: GraphML data file missing from public/data/" && exit 1)

RUN npm run build

# ──────────────────────────────────────────────
# Stage 3: Production runner
# ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Public assets (includes GraphML data for GraphRAG)
COPY --from=builder /app/public ./public

# Pre-render cache directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Output traces for minimal image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Next.js standalone server must bind to 0.0.0.0 inside Docker
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

LABEL org.opencontainers.image.title="STREETS-v3"
LABEL org.opencontainers.image.description="Adaptive educational assessment platform with GraphRAG curriculum intelligence"
LABEL org.opencontainers.image.source="https://github.com/streets/streets-v3"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
