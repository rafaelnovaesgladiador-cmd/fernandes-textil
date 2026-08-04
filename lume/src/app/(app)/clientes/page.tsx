"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HandCoins, Megaphone, Sparkles, UserPlus, UserRoundX, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { SearchInput } from "@/components/search-input";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignDialog } from "@/components/clientes/campaign-dialog";
import { CustomerMessageDialog } from "@/components/clientes/customer-message-dialog";
import { CustomersTable } from "@/components/clientes/customers-table";
import { InteractionDialog } from "@/components/clientes/interaction-dialog";
import { SegmentFilter } from "@/components/clientes/segment-filter";
import {
  countBySegment,
  daysSinceSignup,
  isInactive,
  matchesSegment,
  parseSegment,
  SEGMENT_BY_KEY,
  type SegmentKey,
} from "@/components/clientes/segments";
import { useStore } from "@/hooks/use-store";
import { customerStats, type CustomerStats } from "@/lib/metrics";
import { formatBRL, formatNumber, formatPercent } from "@/lib/format";

export default function ClientesPage() {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent />
    </Suspense>
  );
}

function CustomersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const state = useStore();

  // O segmento vive na URL: links dos alertas (?segmento=inativo) já chegam
  // filtrados e o recorte escolhido pode ser compartilhado com a equipe.
  const segment = parseSegment(searchParams.get("segmento"));
  const setSegment = (key: SegmentKey) => {
    router.replace(key === "todos" ? "/clientes" : `/clientes?segmento=${key}`, {
      scroll: false,
    });
  };

  const [search, setSearch] = useState("");
  const [messageTarget, setMessageTarget] = useState<CustomerStats | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<CustomerStats | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);

  // O alvo continua no estado enquanto o diálogo fecha, para a animação de saída.
  const openMessage = (stat: CustomerStats) => {
    setMessageTarget(stat);
    setMessageOpen(true);
  };
  const openContact = (stat: CustomerStats) => {
    setContactTarget(stat);
    setContactOpen(true);
  };

  const stats = useMemo(() => customerStats(state), [state]);
  const counts = useMemo(() => countBySegment(stats), [stats]);

  const summary = useMemo(() => {
    const totalSpent = stats.reduce((sum, stat) => sum + stat.totalSpent, 0);
    const vip = stats.filter((stat) => stat.segment === "vip");
    const vipSpent = vip.reduce((sum, stat) => sum + stat.totalSpent, 0);
    const pending = stats.filter((stat) => stat.openBalance > 0);
    const inactive = stats.filter(isInactive);
    return {
      vipCount: vip.length,
      vipShare: totalSpent > 0 ? (vipSpent / totalSpent) * 100 : 0,
      pendingTotal: pending.reduce((sum, stat) => sum + stat.openBalance, 0),
      inactiveTicket:
        inactive.length > 0
          ? inactive.reduce((sum, stat) => sum + stat.ticket, 0) / inactive.length
          : 0,
      newCount: stats.filter((stat) => daysSinceSignup(stat.customer) <= 60).length,
      consentCount: stats.filter((stat) => stat.customer.marketingConsent).length,
    };
  }, [stats]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return stats
      .filter((stat) => matchesSegment(stat, segment))
      .filter((stat) => {
        if (!term) return true;
        const customer = stat.customer;
        return (
          customer.name.toLowerCase().includes(term) ||
          customer.phone.replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
          (customer.email ?? "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [stats, segment, search]);

  const hasCustomers = state.customers.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description={`${formatNumber(state.customers.length)} clientes cadastradas · ${formatNumber(
          summary.consentCount
        )} autorizaram receber mensagens.`}
        actions={
          <>
            <Button variant="secondary" onClick={() => setCampaignOpen(true)}>
              <Megaphone /> Criar campanha
            </Button>
            <Button asChild>
              <Link href="/clientes/novo">
                <UserPlus /> Novo cliente
              </Link>
            </Button>
          </>
        }
      />

      {!hasCustomers ? (
        <EmptyState
          icon={Users}
          title="Nenhuma cliente cadastrada ainda"
          description="Cadastre a primeira cliente para acompanhar recompra, tamanhos e preferências."
          action={
            <Button asChild size="sm">
              <Link href="/clientes/novo">
                <UserPlus /> Cadastrar cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <section
            aria-label="Indicadores da base de clientes"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <StatCard
              label="Clientes cadastradas"
              value={formatNumber(state.customers.length)}
              icon={Users}
              hint="Toda a base da loja, com ou sem compra registrada."
            />
            <StatCard
              label="Novas (últimos 60 dias)"
              value={formatNumber(summary.newCount)}
              icon={UserPlus}
              hint="Cadastradas recentemente — a segunda compra é o que fideliza."
            />
            <StatCard
              label="Inativas (+120 dias)"
              value={formatNumber(counts.inativo)}
              icon={UserRoundX}
              hint="Já compraram e pararam. Reativar custa menos que conquistar."
            />
            <StatCard
              label="Com saldo em aberto"
              value={formatNumber(counts.pendente)}
              icon={HandCoins}
              hint={`${formatBRL(summary.pendingTotal)} em parcelas de crediário a receber.`}
            />
          </section>

          <Card className="flex items-start gap-3 p-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Sparkles className="size-4" />
            </div>
            <div className="space-y-1 text-sm">
              <p>
                Suas <strong>{formatNumber(summary.vipCount)} clientes VIP</strong>{" "}
                responderam por {formatPercent(summary.vipShare)} de tudo que a loja
                já vendeu — vale avisá-las antes de qualquer promoção geral.
              </p>
              <p className="text-muted-foreground">
                Há {formatNumber(counts.inativo)} clientes sem comprar há mais de
                120 dias. Cada uma gastava em média{" "}
                {formatBRL(summary.inactiveTicket)} por compra: trazer parte delas
                de volta vale mais do que descontar para quem já compra.
              </p>
            </div>
          </Card>

          <div className="space-y-3">
            <SegmentFilter value={segment} counts={counts} onChange={setSegment} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome, telefone ou e-mail…"
                aria-label="Buscar clientes"
                className="sm:max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                {formatNumber(rows.length)}{" "}
                {rows.length === 1 ? "cliente" : "clientes"} ·{" "}
                {SEGMENT_BY_KEY[segment].description}
              </p>
            </div>
          </div>

          <CustomersTable
            rows={rows}
            onSelect={(stat) => router.push(`/clientes/${stat.customer.id}`)}
            onMessage={openMessage}
            onContact={openContact}
            emptyState={
              <EmptyState
                icon={Users}
                title="Nenhuma cliente neste recorte"
                description="Ajuste o segmento ou limpe a busca para ver outras clientes."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSegment("todos");
                      setSearch("");
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            }
          />
        </>
      )}

      <CustomerMessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        stat={messageTarget}
        storeName={state.company.tradeName}
      />

      <InteractionDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        customer={contactTarget?.customer ?? null}
      />

      <CampaignDialog
        open={campaignOpen}
        onOpenChange={setCampaignOpen}
        stats={stats}
        initialSegment={segment}
        storeName={state.company.tradeName}
      />
    </div>
  );
}

function CustomersSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando clientes">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
