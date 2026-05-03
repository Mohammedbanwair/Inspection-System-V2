# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Bake the backend URL into the React build (CRA reads env at build time)

ENV REACT_APP_BACKEND_URL=https://inspection-system-v2-production.up.railway.app

# Install deps first (layer caching)
COPY package.json ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# Copy source and build
COPY . .
RUN yarn build

# ---------- Serve stage ----------
FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
