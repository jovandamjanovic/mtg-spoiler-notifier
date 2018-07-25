FROM node

WORKDIR docker/app

COPY package*.json ./
COPY . .

CMD ["npm", "start"]