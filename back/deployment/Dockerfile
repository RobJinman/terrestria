FROM node:10.15-stretch

WORKDIR /usr/app

COPY dist/ .
COPY package-lock.json .

RUN npm install --only=production
RUN npm install pm2 -g

EXPOSE 3001

ARG PINATA_API_BASE=https://api.pinatagames.com
ARG PRODUCT_KEY=XXXXXXXX

ENV PINATA_API_BASE=$PINATA_API_BASE
ENV PRODUCT_KEY=$PRODUCT_KEY

CMD ["pm2-runtime", "index.js"]
