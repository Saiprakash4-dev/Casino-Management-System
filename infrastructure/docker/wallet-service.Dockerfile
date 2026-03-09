FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/wallet-service services/wallet-service
COPY packages packages
RUN npm install
EXPOSE 4003
CMD ["npm", "start", "--workspace", "services/wallet-service"]
