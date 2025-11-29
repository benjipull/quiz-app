# Stage 1: Build the React app
FROM node:18 AS build

WORKDIR /app

# Accept build-time environment variable from Cloud Build
ARG VITE_API_BASE_URL

# write it to file
RUN echo "VITE_BASE_URL=${VITE_API_BASE_URL}" > .env


COPY package.json package-lock.json ./
RUN npm install

# Optional safeguard: ensure react-ga4 exists
RUN npm install react-ga4

COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
