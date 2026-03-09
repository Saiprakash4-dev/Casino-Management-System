FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/notification-service services/notification-service
COPY packages packages
RUN npm install
EXPOSE 4004
CMD ["npm", "start", "--workspace", "services/notification-service"]
