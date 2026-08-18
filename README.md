# fernandes-textil

Este repositório contém dois sistemas independentes:

| Diretório | Sistema | Stack |
|---|---|---|
| `lume/` | **Lume** — protótipo SaaS de gestão para lojas de moda feminina (novo) | Next.js 16 + TypeScript + Tailwind |
| raiz (`server.js`, `public/`) | Sistema legado Fernandes Têxtil | Express + SQLite |

## ▶️ Rodar o Lume (recomendado)

Pré-requisito: [Node.js](https://nodejs.org) 20.9 ou superior (`node --version`).

```bash
cd lume
npm install
npm run dev
```

Abra **http://localhost:3000** no navegador.

Na tela de login, clique em **Entrar** (as credenciais de demonstração já vêm
preenchidas) ou em **“Explorar com dados de demonstração”** — os dois caminhos
levam à loja fictícia Bella Moda Feminina, com 6 meses de vendas simuladas.

Comandos úteis:

```bash
npm run build   # build de produção
npm run start   # serve o build (http://localhost:3000)
npx tsx scripts/sanity.ts   # confere a coerência dos dados de demonstração
```

Mais detalhes (arquitetura, decisões e roadmap): [`lume/README.md`](lume/README.md).

## Rodar o sistema legado

```bash
npm install
npm start        # http://localhost:3000
```

> Os dois usam a porta 3000 por padrão — rode um de cada vez, ou ajuste a porta
> (`npm run dev -- -p 3001` no Lume).
