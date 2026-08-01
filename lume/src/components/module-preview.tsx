"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGE_LABELS: Record<number, string> = {
  2: "Etapa 2 — Operação comercial",
  3: "Etapa 3 — Gestão",
  4: "Etapa 4 — Crescimento",
};

/**
 * Página de módulo ainda não construído: mostra números REAIS da base de
 * demonstração (para provar que os dados já existem) e o escopo planejado.
 * Nenhuma página do menu fica desconectada ou vazia.
 */
export function ModulePreview({
  title,
  description,
  stage,
  icon: Icon,
  stats,
  features,
  children,
}: {
  title: string;
  description: string;
  stage: 2 | 3 | 4;
  icon: LucideIcon;
  stats?: Array<{ label: string; value: string }>;
  features: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="accent">{STAGE_LABELS[stage]}</Badge>}
      />

      {stats && stats.length > 0 ? (
        <section
          aria-label={`Resumo atual de ${title}`}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-1.5 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
                {stat.value}
              </p>
            </Card>
          ))}
        </section>
      ) : null}

      {children}

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-5" />
          </span>
          <div>
            <CardTitle>O que este módulo terá</CardTitle>
            <p className="text-sm text-muted-foreground">
              Os dados de demonstração acima já alimentam estas funções.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/70" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/visao-geral">
                Voltar à visão geral <ArrowRight />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Este módulo entra na {STAGE_LABELS[stage].toLowerCase()} do protótipo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
