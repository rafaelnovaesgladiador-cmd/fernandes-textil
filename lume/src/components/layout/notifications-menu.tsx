"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { demoAlerts } from "@/lib/alerts";
import { ALERT_PRIORITY_LABELS } from "@/lib/types";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRIORITY_VARIANT = {
  baixa: "secondary",
  media: "warning",
  alta: "serious",
  critica: "critical",
} as const;

export function NotificationsMenu() {
  const open = demoAlerts.filter((a) => a.status === "aberto");
  const top = [...open]
    .sort((a, b) => {
      const order = { critica: 0, alta: 1, media: 2, baixa: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notificações: ${open.length} alertas abertos`}
          className="relative"
        >
          <Bell className="size-4.5" />
          {open.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-critical text-[10px] font-semibold text-white">
              {open.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notificações</p>
          <Badge variant="secondary">{open.length} abertas</Badge>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {top.map((alert) => (
            <Link
              key={alert.id}
              href={alert.actionHref}
              className={cn(
                "flex flex-col gap-1 border-b px-3 py-2.5 text-left transition-colors last:border-b-0",
                "hover:bg-secondary focus-visible:bg-secondary outline-none"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant={PRIORITY_VARIANT[alert.priority]}>
                  {ALERT_PRIORITY_LABELS[alert.priority]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDayMonth(alert.date)}
                </span>
              </div>
              <p className="line-clamp-2 text-sm leading-snug">{alert.title}</p>
            </Link>
          ))}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href="/alertas">Ver central de alertas</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
