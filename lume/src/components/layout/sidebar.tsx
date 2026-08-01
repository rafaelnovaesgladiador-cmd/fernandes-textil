"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Brand } from "@/components/brand";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NAV_GROUPS } from "@/lib/nav";
import { demoCompany } from "@/lib/mock";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link
            href="/visao-geral"
            className="outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-md"
          >
            <Brand inverse size="sm" />
          </Link>
        )}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex size-8 items-center justify-center rounded-md text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring cursor-pointer"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4.5" />
          ) : (
            <PanelLeftClose className="size-4.5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3" aria-label="Menu principal">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? groupIndex} className="px-2 pb-2">
            {group.label && !collapsed && (
              <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-muted-foreground">
                {group.label}
              </p>
            )}
            {group.label && collapsed && (
              <div className="mx-2 my-2 h-px bg-sidebar-border" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      collapsed && "justify-center px-2",
                      active
                        ? "bg-sidebar-active font-medium text-sidebar-active-foreground"
                        : "text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-active-foreground"
                    )}
                  >
                    <item.icon className="size-4.5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
                return (
                  <li key={item.href}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-sidebar-border p-3",
          collapsed && "flex justify-center p-2"
        )}
      >
        {collapsed ? (
          <span className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-active-foreground">
            {demoCompany.logoInitials}
          </span>
        ) : (
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-semibold text-sidebar-active-foreground">
              {demoCompany.logoInitials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-active-foreground">
                {demoCompany.tradeName}
              </p>
              <p className="truncate text-xs text-sidebar-muted-foreground">
                {demoCompany.city}/{demoCompany.state} · Plano Gestão
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
