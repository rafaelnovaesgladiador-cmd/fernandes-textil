"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, Check, ChevronRight, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALERT_PRIORITY_ORDER,
  ALERT_PRIORITY_VARIANT,
  useAlerts,
} from "@/hooks/use-alerts";
import { setAlertStatus } from "@/lib/store";
import { formatBRL, formatDate } from "@/lib/format";
import {
  ALERT_CATEGORY_LABELS,
  ALERT_PRIORITY_LABELS,
  type Alert,
  type AlertCategory,
  type AlertPriority,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AlertsPage() {
  const allAlerts = useAlerts();
  const [category, setCategory] = useState<AlertCategory | "todas">("todas");
  const [priority, setPriority] = useState<AlertPriority | "todas">("todas");

  const alerts = useMemo(
    () =>
      allAlerts
        .filter((alert) => category === "todas" || alert.category === category)
        .filter((alert) => priority === "todas" || alert.priority === priority)
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === "aberto" ? -1 : 1;
          return ALERT_PRIORITY_ORDER[a.priority] - ALERT_PRIORITY_ORDER[b.priority];
        }),
    [allAlerts, category, priority]
  );

  const openCount = alerts.filter((a) => a.status === "aberto").length;

  const resolve = (alert: Alert) => {
    setAlertStatus(alert.id, "resolvido");
    toast.success("Alerta marcado como resolvido", {
      description: alert.title,
      action: {
        label: "Desfazer",
        onClick: () => setAlertStatus(alert.id, "aberto"),
      },
    });
  };

  const ignore = (alert: Alert) => {
    setAlertStatus(alert.id, "ignorado");
    toast("Alerta ignorado", {
      description: "Ele não aparecerá mais como pendente.",
      action: {
        label: "Desfazer",
        onClick: () => setAlertStatus(alert.id, "aberto"),
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas e recomendações"
        description={`${openCount} ${openCount === 1 ? "alerta aberto" : "alertas abertos"} — cada um com impacto estimado e ação sugerida.`}
        actions={
          <div className="flex items-center gap-2">
            <Filter className="hidden size-4 text-muted-foreground sm:block" />
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as AlertCategory | "todas")}
            >
              <SelectTrigger size="sm" aria-label="Filtrar por categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {(Object.keys(ALERT_CATEGORY_LABELS) as AlertCategory[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {ALERT_CATEGORY_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as AlertPriority | "todas")}
            >
              <SelectTrigger size="sm" aria-label="Filtrar por prioridade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as prioridades</SelectItem>
                {(Object.keys(ALERT_PRIORITY_LABELS) as AlertPriority[]).map(
                  (key) => (
                    <SelectItem key={key} value={key}>
                      {ALERT_PRIORITY_LABELS[key]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nenhum alerta neste filtro"
          description="Ajuste a categoria ou a prioridade para ver outros alertas."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategory("todas");
                setPriority("todas");
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={cn("p-4 sm:p-5", alert.status !== "aberto" && "opacity-60")}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={ALERT_PRIORITY_VARIANT[alert.priority]}>
                  {ALERT_PRIORITY_LABELS[alert.priority]}
                </Badge>
                <Badge variant="outline">
                  {ALERT_CATEGORY_LABELS[alert.category]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(alert.date)} · Responsável: Proprietário
                </span>
                {alert.status !== "aberto" && (
                  <Badge variant="secondary" className="ml-auto">
                    {alert.status === "resolvido" ? "Resolvido" : "Ignorado"}
                  </Badge>
                )}
              </div>

              <h2 className="mt-2.5 text-base font-semibold leading-snug">
                {alert.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {alert.explanation}
              </p>

              <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
                <p>
                  <span className="font-medium">Recomendação: </span>
                  {alert.recommendation}
                </p>
                {alert.estimatedImpact ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Impacto financeiro estimado:{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatBRL(alert.estimatedImpact)}
                    </span>
                  </p>
                ) : null}
              </div>

              {alert.status === "aberto" ? (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm">
                    <Link href={alert.actionHref}>
                      {alert.actionLabel} <ChevronRight />
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resolve(alert)}>
                    <Check /> Marcar como resolvido
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => ignore(alert)}>
                    Ignorar
                  </Button>
                </div>
              ) : (
                <div className="mt-3.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAlertStatus(alert.id, "aberto")}
                  >
                    Reabrir alerta
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
