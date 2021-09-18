# syntax=docker/dockerfile:1
FROM node:16
WORKDIR /app

ADD package.json /tmp
RUN cd /tmp && npm install
RUN mv /tmp/node_modules /app

COPY . .
RUN npm run build
EXPOSE ${PORT}
CMD ["npm", "run", "start"]
