FROM node:26.13.0-alpine

WORKDIR /app

RUN npm install --global corepack@0.34.6 && corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN DATABASE_URL=postgresql://localhost:5432/tubeyu pnpm run prisma:generate

EXPOSE 3000

CMD ["pnpm", "run", "dev"]
