# syntax=docker/dockerfile:1

# Upstream commit to package. Keep in sync with `version` in
# mcruces-gods-eye-view/umbrel-app.yml (0.1.1-<short sha>).
ARG GEV_COMMIT=b210ab0fe4d71c7faa0268134e0aa5f3c53fc7fe

FROM --platform=$BUILDPLATFORM alpine:3.22 AS source
ARG GEV_COMMIT
ADD https://github.com/bilawalsidhu/gods-eye-view.git#${GEV_COMMIT} /src

# The browser bundle is architecture independent: build it natively. Client
# keys are baked in by Vite `define`, so build with placeholders that the
# entrypoint swaps for the values set in umbrelOS at container start.
FROM --platform=$BUILDPLATFORM node:24-alpine AS build
ENV PUPPETEER_SKIP_DOWNLOAD=1
WORKDIR /src
COPY --from=source /src/package.json /src/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY --from=source /src ./
RUN GOOGLE_MAPS_API_KEY=__GEV_RUNTIME_GOOGLE_MAPS_API_KEY__ \
    CESIUM_ION_TOKEN=__GEV_RUNTIME_CESIUM_ION_TOKEN__ \
    npm run build

# Runtime: `vite preview` serves the bundle and mounts the server-side
# provider proxies (they are Vite middleware). Needs target-arch node_modules
# (vite, rollup and esbuild ship native binaries).
FROM node:24-alpine
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    HOST=0.0.0.0 \
    PORT=4173
# The node user is UID/GID 1000, matching umbrelOS app data ownership
RUN mkdir /app && chown node:node /app
WORKDIR /app
USER node
COPY --chown=node:node --from=source /src/package.json /src/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund --include=dev \
    && npm cache clean --force
COPY --chown=node:node --from=source /src ./
COPY --chown=node:node --from=build /src/dist ./dist.pristine
COPY entrypoint.sh inject-client-keys.mjs /usr/local/bin/
RUN mkdir -p .gev-cache
EXPOSE 4173
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
