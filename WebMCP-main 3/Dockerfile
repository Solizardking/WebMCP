FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV WEBMCP_CONFIG_DIR=/data
CMD ["node", "build/index.js", "--mcp"]
