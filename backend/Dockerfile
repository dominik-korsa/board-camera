# syntax=docker/dockerfile:1
FROM node:16
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE ${PORT}
CMD ["npm", "run", "start"]
