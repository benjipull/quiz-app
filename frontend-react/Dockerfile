# Stage 1: Build the React app
FROM node:18 AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ARG ANALYTICS_ENABLED

COPY package.json package-lock.json ./
RUN npm install

RUN npm install react-ga4

COPY . .
RUN npm run build

RUN echo "VITE_BASE_URL=${VITE_API_BASE_URL}" > .env \
 && echo "VITE_ANALYTICS_ENABLED=${ANALYTICS_ENABLED}" >> .env

RUN cat .env

# Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
