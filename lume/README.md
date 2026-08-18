# Lume — Gestão inteligente para lojas de moda

SaaS de gestão para lojas de moda feminina. Em português do Brasil,
mobile-first, com dados de demonstração realistas da loja fictícia
**Bella Moda Feminina**.

> “Uma plataforma inteligente que mostra onde sua loja ganha dinheiro,
> onde perde e o que fazer para vender mais.”

## Como executar

Pré-requisito: Node.js 20.9 ou superior.

```bash
cd lume
npm install
npm run dev        # http://localhost:3000
```

No login, clique em **Entrar** (credenciais já preenchidas) ou em
**“Explorar com dados de demonstração”**.

Outros comandos:

```bash
npm run build       # build de produção
npm run start       # serve o build
npm run build:demo  # gera a demo em arquivo único (spa/.out/)
npx tsx scripts/sanity.ts   # confere a coerência dos números
node scripts/e2e.mjs        # teste ponta a ponta (com o app rodando)
npx eslint src              # lint
```

## O que o sistema faz

| Módulo | Principais funções |
|---|---|
| **Visão geral** | 12 indicadores com comparação de período, gráficos, meta do mês e a seção “O que merece sua atenção” |
| **Vendas** | Fluxo completo de venda (produto → cor/tamanho → cliente → desconto → pagamento), histórico, comprovante, cancelamento e devolução |
| **Caixa** | Abertura, sangria, reforço e fechamento com conferência cega |
| **Produtos** | Cadastro com variações por cor e tamanho, margem em tempo real, duplicação, etiquetas |
| **Estoque** | Posição, movimentações auditadas, curva ABC, giro, cobertura, reposição e liquidação |
| **Compras** | Pedidos a fornecedores, sugestão de reposição, recebimento que entra no estoque e gera as duplicatas |
| **Clientes** | CRM com segmentos, perfil completo, histórico, interações e campanhas |
| **Vendedores** | Desempenho multi-critério (não só faturamento), metas e comissões |
| **Financeiro** | Contas a pagar e receber, despesas, fluxo de caixa com projeção e DRE simplificada |
| **Catálogo** | Vitrine pública compartilhável que gera pedidos por WhatsApp, com estúdio de imagens por IA |
| **Relatórios** | 10 relatórios com comparação de períodos e exportação |
| **Alertas** | Central de recomendações com impacto estimado e ação direta |
| **Configurações** | Dados da loja, regras financeiras, metas, equipe, permissões, planos e auditoria |

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
    (app)/           sistema: visão geral, vendas, caixa, produtos, estoque,
                     compras, clientes, vendedores, financeiro, catálogo,
                     relatórios, alertas, configurações
    (public)/        vitrine pública do catálogo
  components/
    ui/              design system (button, card, dialog, select, …)
    layout/          sidebar, topbar, barra inferior mobile, notificações
    dashboard/       cards de KPI, gráficos, seção de atenção
    <módulo>/        componentes de cada módulo
  hooks/             useStore, useSession, useAlerts
  lib/
    types.ts         modelo de domínio multiempresa
    store/           estado da aplicação e ações de negócio
    ai/images.ts     camada única de imagens por IA (hoje simulada)
    metrics.ts       indicadores derivados do estado
    alerts.ts        alertas calculados da mesma base
    permissions.ts   matriz de permissões por perfil
    mock/            massa de dados de demonstração
supabase/migrations/ esquema SQL e políticas de segurança
spa/                 empacotador da demo em arquivo único
docs/PRODUCAO.md     passo a passo para produção
docs/ESTUDIO-IA.md   estúdio de imagens e troca do provedor
```

## Decisões de arquitetura

- **Um único estado, muitas leituras** — as telas nunca guardam números
  próprios: tudo é derivado de `src/lib/store` por `src/lib/metrics.ts`. Uma
  venda registrada muda estoque, financeiro, comissões, alertas e dashboard na
  mesma hora, porque todos leem a mesma fonte.
- **Ações de negócio, não CRUD** — `createSale` não apenas grava a venda: baixa
  o estoque, registra a movimentação, gera as parcelas do crediário e grava a
  auditoria. É a mesma transação que vira função no banco em produção.
- **Coerência por construção** — a base de demonstração é gerada a partir das
  vendas; impostos, taxas de cartão e contas a receber são calculados delas.
- **Determinismo** — PRNG com semente fixa e “hoje” ancorado em 01/08/2026
  (America/Sao_Paulo): servidor e cliente renderizam o mesmo HTML.
- **Multiempresa desde o dia 1** — toda entidade carrega `companyId`, e o
  esquema em `supabase/migrations` aplica isolamento por RLS.
- **Provedor atrás de uma porta só** — as três operações de imagem por IA
  vivem em `src/lib/ai/images.ts`. As telas chamam ações de negócio, nunca o
  provedor; trocar a simulação pela FASHN mexe apenas nesse arquivo.

- **Segurança em duas camadas** — a interface esconde o que o perfil não pode
  usar; o banco recusa a operação mesmo se a tela for burlada.

## Estado atual

Etapas 1 a 4 implementadas e funcionais com dados locais. A Etapa 5
(banco real, autenticação e cobrança) está preparada: esquema, políticas de
segurança, permissões e o passo a passo em [`docs/PRODUCAO.md`](docs/PRODUCAO.md).

O que ainda é simulado: geração de imagens por IA (o fluxo inteiro é
navegável sem chave de API — ver [`docs/ESTUDIO-IA.md`](docs/ESTUDIO-IA.md)),
envio de mensagens (WhatsApp/e-mail abre o texto pronto para copiar),
exportação de PDF/Excel, emissão fiscal e meios de pagamento.
