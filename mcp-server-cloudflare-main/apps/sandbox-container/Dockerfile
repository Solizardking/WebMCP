FROM node:22-alpine
RUN apk add --no-cache python3 py3-pip git curl build-base
WORKDIR /app
COPY apps/sandbox-container/container/package.json apps/sandbox-container/container/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY apps/sandbox-container/container ./container
COPY apps/sandbox-container/shared ./shared
RUN mkdir /workdir && chown node:node /workdir
ENV SANDBOX_WORKDIR=/workdir SANDBOX_HOST=0.0.0.0 HOME=/workdir
USER node
EXPOSE 8080
CMD ["node", "--import", "tsx", "container/sandbox.container.app.ts"]
