# This image runs the Vite dev server, not a production build - it exists
# so `docker compose up` can bring up the whole stack for local
# development. The actual production frontend is a static build deployed to
# Vercel, which does its own build using the VITE_* env vars configured
# there (see the root README's deployment section).
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
