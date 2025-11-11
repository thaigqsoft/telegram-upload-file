FROM node:20-bullseye

# Install build dependencies for native modules like sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8405

EXPOSE 8405

CMD ["npm","run", "start"]

