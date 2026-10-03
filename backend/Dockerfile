FROM node:20-alpine

WORKDIR /app/backend

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

USER node
EXPOSE 8080

CMD ["node", "server.js"]
