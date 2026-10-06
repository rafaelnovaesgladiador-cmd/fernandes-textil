# Imagem para hospedar o sistema (Railway, Render, Fly.io ou qualquer VPS com Docker)
# Etapa 1: instala dependências (a imagem completa já tem python/make/g++ para o better-sqlite3)
FROM node:22 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Etapa 2: imagem final enxuta
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js operacao.js ./
COPY public ./public
RUN mkdir -p /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
