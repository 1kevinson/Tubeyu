FROM node:26.13.0-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN DATABASE_URL=postgresql://localhost:5432/tubeyu npm run prisma:generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
