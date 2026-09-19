FROM node:22

WORKDIR /app

COPY app/package*.json ./

RUN npm install

COPY app/ .

EXPOSE 3000

CMD ["node", "server.js"]