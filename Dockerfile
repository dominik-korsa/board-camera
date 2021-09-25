# syntax=docker/dockerfile:1
FROM node:16 AS base
WORKDIR /app

ADD backend/package.json /tmp
RUN cd /tmp && npm install
RUN mv /tmp/node_modules /app

COPY backend /app
RUN npm run build
EXPOSE ${PORT}
CMD ["npm", "run", "start"]

FROM node:16 AS build-website
WORKDIR /app

ADD website/package.json /tmp
RUN cd /tmp && npm install
RUN mv /tmp/node_modules /app

COPY website /app
RUN npm run build

FROM base AS production
COPY --from="build-website" /app/dist /data/website
ENV SERVER_MODE=production

FROM base AS development
ENV SERVER_MODE=development
