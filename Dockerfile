FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN npm run build
EXPOSE 5000
CMD ["node_modules/.bin/tsx", "server/index.ts"]
