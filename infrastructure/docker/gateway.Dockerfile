FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "-e", "console.log('Build gateway image from monorepo root')"]
