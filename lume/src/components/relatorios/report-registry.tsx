"use client";

import type { ComponentType } from "react";
import type { ReportProps } from "@/components/relatorios/report-shell";
import { ClientesReport } from "@/components/relatorios/clientes-report";
import { DescontosReport } from "@/components/relatorios/descontos-report";
import { DespesasReport } from "@/components/relatorios/despesas-report";
import { DevolucoesReport } from "@/components/relatorios/devolucoes-report";
import { EstoqueReport } from "@/components/relatorios/estoque-report";
import { FinanceiroReport } from "@/components/relatorios/financeiro-report";
import { PagamentosReport } from "@/components/relatorios/pagamentos-report";
import { ProdutosReport } from "@/components/relatorios/produtos-report";
import { VendasReport } from "@/components/relatorios/vendas-report";
import { VendedoresReport } from "@/components/relatorios/vendedores-report";

export type ReportKey =
  | "vendas"
  | "produtos"
  | "estoque"
  | "clientes"
  | "vendedores"
  | "financeiro"
  | "despesas"
  | "pagamentos"
  | "descontos"
  | "devolucoes";

export interface ReportDefinition {
  key: ReportKey;
  label: string;
  description: string;
  Component: ComponentType<ReportProps>;
}

/** Catálogo de relatórios — a ordem aqui é a ordem do seletor. */
export const REPORTS: ReportDefinition[] = [
  {
    key: "vendas",
    label: "Vendas",
    description: "Faturamento, volume, ticket médio e peças por dia",
    Component: VendasReport,
  },
  {
    key: "produtos",
    label: "Produtos",
    description: "Ranking por faturamento, com lucro e margem",
    Component: ProdutosReport,
  },
  {
    key: "estoque",
    label: "Estoque",
    description: "Posição atual por categoria: peças, custo e potencial",
    Component: EstoqueReport,
  },
  {
    key: "clientes",
    label: "Clientes",
    description: "Novos × recorrentes, ticket por segmento e top 10",
    Component: ClientesReport,
  },
  {
    key: "vendedores",
    label: "Vendedores",
    description: "Faturamento, margem, ticket e comissão por vendedora",
    Component: VendedoresReport,
  },
  {
    key: "financeiro",
    label: "Financeiro",
    description: "Receitas, despesas e resultado do período",
    Component: FinanceiroReport,
  },
  {
    key: "despesas",
    label: "Despesas",
    description: "Por categoria, com peso no total e variação",
    Component: DespesasReport,
  },
  {
    key: "pagamentos",
    label: "Meios de pagamento",
    description: "Composição do faturamento e taxas de cartão estimadas",
    Component: PagamentosReport,
  },
  {
    key: "descontos",
    label: "Descontos",
    description: "Quanto foi concedido e o impacto na margem",
    Component: DescontosReport,
  },
  {
    key: "devolucoes",
    label: "Devoluções",
    description: "Vendas devolvidas e canceladas, com motivo aparente",
    Component: DevolucoesReport,
  },
];

const KEYS = new Set<string>(REPORTS.map((report) => report.key));

export function isReportKey(value: unknown): value is ReportKey {
  return typeof value === "string" && KEYS.has(value);
}

export function reportByKey(key: ReportKey): ReportDefinition {
  return REPORTS.find((report) => report.key === key) ?? REPORTS[0];
}
