FROM node:16-alpine

VOLUME ["/node-mqtt-transponder/shared/node_modules", "/node-mqtt-transponder/server/node_modules"]

WORKDIR /node-mqtt-transponder/shared
COPY shared/package.json .
RUN npm install
COPY shared .

WORKDIR /node-mqtt-transponder/server
COPY server/package.json .
RUN npm install
COPY server .

RUN chown -R 1000:1000 "/root/.npm"

WORKDIR /node-mqtt-transponder
COPY .env.example .env
