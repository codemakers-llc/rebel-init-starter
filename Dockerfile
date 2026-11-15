FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/
ENV MODE=proto PORT=3100
EXPOSE 3100
CMD ["npm", "start"]
