FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/game-service services/game-service
COPY packages packages
RUN npm install
EXPOSE 4002
CMD ["npm", "start", "--workspace", "services/game-service"]
