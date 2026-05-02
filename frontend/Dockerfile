# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Bake the backend URL into the React build (CRA reads env at build time)
ARG REACT_APP_BACKEND_URL=http://localhost:8001
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

# Install deps first (layer caching)
COPY package.json yarn.lock ./
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
