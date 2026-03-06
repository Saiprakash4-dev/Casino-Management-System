FROM node:20-alpine
WORKDIR /app
COPY . .
CMD ["node", "-e", "console.log('Build auth-service image from monorepo root')"]
