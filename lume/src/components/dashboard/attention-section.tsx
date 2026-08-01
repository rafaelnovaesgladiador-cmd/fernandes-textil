"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoAlerts } from "@/lib/alerts";
import { ALERT_CATEGORY_LABELS, ALERT_PRIORITY_LABELS } from "@/lib/types";

const PRIORITY_VARIANT = {
  baixa: "secondary",
  media: "warning",
  alta: "serious",
  critica: "critical",
} as const;

const PRIORITY_ORDER = { critica: 0, alta: 1, media: 2, baixa: 3 } as const;

/** "O que merece sua atenção" — alertas priorizados com ação direta. */
export function AttentionSection() {
  const top = [...demoAlerts]
    .filter((alert) => alert.status === "aberto")
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 4);

  return (
    <section aria-labelledby="attention-title">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2
          id="attention-title"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <Lightbulb className="size-4.5 text-warning" />
          O que merece sua atenção
        </h2>
        <Button asChild variant="ghost" size="sm">
          <Link href="/alertas">
            Ver todos <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {top.map((alert) => (
          <Card key={alert.id} className="flex flex-col p-4">
            <div className="flex items-center gap-2">
              <Badge variant={PRIORITY_VARIANT[alert.priority]}>
                {ALERT_PRIORITY_LABELS[alert.priority]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {ALERT_CATEGORY_LABELS[alert.category]}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-snug">{alert.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {alert.recommendation}
            </p>
            <div className="mt-3 pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href={alert.actionHref}>{alert.actionLabel}</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
