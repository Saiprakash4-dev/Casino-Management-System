FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/auth-service services/auth-service
COPY packages packages
RUN npm install
EXPOSE 4001
CMD ["npm", "start", "--workspace", "services/auth-service"]
