FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/api-gateway services/api-gateway
COPY packages packages
RUN npm install --legacy-peer-deps
EXPOSE 4000
CMD ["npm", "start", "--workspace", "services/api-gateway"]
