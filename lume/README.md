# Lume — Gestão inteligente para lojas de moda

Protótipo funcional (MVP — **Etapa 1: Fundação**) de um SaaS de gestão para
lojas de moda feminina. Em português do Brasil, mobile-first, com dados de
demonstração realistas da loja fictícia **Bella Moda Feminina**.

> “Uma plataforma inteligente que mostra onde sua loja ganha dinheiro,
> onde perde e o que fazer para vender mais.”

## Como executar

```bash
cd lume
npm install
npm run dev        # http://localhost:3000
```

Outros comandos:

```bash
npm run build      # build de produção
npm run start      # serve o build
npx eslint src     # lint
npx tsx scripts/sanity.ts   # confere a coerência dos dados de demonstração
```

No login, use **Entrar** (credenciais já preenchidas) ou
**“Explorar com dados de demonstração”**.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + componentes estilo shadcn/ui (Radix primitives)
- Recharts (gráficos) · Lucide (ícones) · React Hook Form + Zod (formulários)
- next-themes (modo claro/escuro) · sonner (toasts)

## Estrutura

```
src/
  app/
    (auth)/          login, seleção de empresa, onboarding
    (app)/           shell autenticado: visão geral, alertas, configurações
                     + páginas de módulo (vendas, produtos, estoque, …)
  components/
    ui/              design system (button, card, dialog, select, …)
    layout/          sidebar, topbar, barra inferior mobile, notificações
    dashboard/       cards de KPI, gráficos, seção "O que merece sua atenção"
  hooks/             useSession (autenticação simulada)
  lib/
    types.ts         modelo de domínio multiempresa (companyId em tudo)
    mock/            massa de dados determinística da Bella Moda Feminina
    metrics.ts       KPIs calculados a partir das vendas/despesas mockadas
    alerts.ts        alertas DERIVADOS dos dados (nunca escritos à mão)
```

## Decisões de arquitetura

- **Coerência por construção** — o gerador cria as vendas primeiro; impostos,
  taxas de cartão e contas a receber (crediário) são calculados a partir
  delas, e todos os números do Dashboard e dos alertas saem da mesma base.
- **Determinismo** — PRNG com semente fixa + “hoje” ancorado em 01/08/2026
  (America/Sao_Paulo): servidor e cliente renderizam exatamente o mesmo HTML.
- **Multiempresa desde o dia 1** — toda entidade carrega `companyId`; a troca
  dos mocks pelo Supabase (RLS por empresa) está prevista para a Etapa 5 sem
  mudança de interface (`src/lib/mock` é a única camada a substituir).
- **Sessão simulada** — `useSession` persiste login/loja no `localStorage` via
  `useSyncExternalStore`; será trocado pelo Supabase Auth mantendo a API.

## Roadmap

| Etapa | Escopo | Status |
|---|---|---|
| 1 — Fundação | design system, navegação, auth simulada, onboarding, Dashboard, alertas, configurações, dados demo | ✅ concluída |
| 2 — Operação comercial | produtos, variações, estoque, nova venda, clientes, vendedores | ◻️ |
| 3 — Gestão | financeiro, contas, fluxo de caixa, metas, comissões, relatórios | ◻️ |
| 4 — Crescimento | catálogo virtual, CRM, campanhas, análises de estoque | ◻️ |
| 5 — Produção | Supabase (banco/auth/RLS), permissões, auditoria, planos | ◻️ |

As páginas dos módulos futuros já existem, navegáveis, com números reais da
base de demonstração e o escopo planejado — nenhum item do menu leva a uma
página vazia.
