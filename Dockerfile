# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine (musl); install it so the
# correct libssl is detected instead of falling back to a missing 1.1.x.
RUN apk add --no-cache openssl libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build Next.js. A DATABASE_URL must be present because Prisma reads it from
# the schema's env() at build time; it is overridden at runtime via compose/env.
ENV DATABASE_URL="file:./dev.db"
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Runtime also needs OpenSSL for the Prisma query engine.
RUN apk add --no-cache openssl libc6-compat

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Default DB location; override via compose/env for a mounted volume.
ENV DATABASE_URL="file:./dev.db"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the app
CMD ["sh", "-c", "pnpm prisma db push --accept-data-loss && pnpm prisma db seed && pnpm start"]
