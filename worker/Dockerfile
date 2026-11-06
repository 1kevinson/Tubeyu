FROM node:20-alpine

WORKDIR /app

RUN npm install --global corepack@0.34.6 && corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

CMD ["pnpm", "run", "start:dev"]