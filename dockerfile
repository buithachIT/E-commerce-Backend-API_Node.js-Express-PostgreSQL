FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

# Prefer lockfile when present; fall back to npm install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY . .

EXPOSE 3055

CMD ["node", "server.js"]
