# --- build stage ---
FROM node:20-alpine AS build

WORKDIR /app

# Pin pnpm 10.32.1 (same as sammlung). pnpm 11's supply-chain policies are not
# wanted here.
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Install deps first for layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# VITE_API_URL is baked into the bundle at build time.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN pnpm build

# --- serve stage ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
