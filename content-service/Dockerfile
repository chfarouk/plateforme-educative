FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev --no-package-lock
COPY ./src ./src
EXPOSE 3002 
CMD [ "node", "src/server.js" ]