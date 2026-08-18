"use client";

import { Suspense, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LayoutDashboard,
  Receipt,
  ScrollText,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CashFlowTab } from "@/components/financeiro/cash-flow-tab";
import { DreTab } from "@/components/financeiro/dre-tab";
import { ExpensesTab } from "@/components/financeiro/expenses-tab";
import { OverviewTab, type FinanceTab } from "@/components/financeiro/overview-tab";
import { PayablesTab } from "@/components/financeiro/payables-tab";
import { ReceivablesTab } from "@/components/financeiro/receivables-tab";
import { useStore } from "@/hooks/use-store";

/**
 * Financeiro — a leitura de dinheiro da loja em um lugar só.
 *
 * A aba ativa vive na URL (`?aba=`), então links do dashboard e dos alertas
 * abrem direto no assunto certo (e o link pode ser compartilhado).
 */

const TABS: FinanceTab[] = ["visao", "pagar", "receber", "despesas", "fluxo", "dre"];

function isFinanceTab(value: string | null): value is FinanceTab {
  return value !== null && (TABS as string[]).includes(value);
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinanceContent />
    </Suspense>
  );
}

function FinanceContent() {
  const state = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // `?nova=1` abre o formulário de despesa já na chegada (atalho do dashboard)
  // e, por consequência, garante que a aba de despesas seja a ativa.
  const wantsNewExpense = searchParams.get("nova") === "1";
  const tabParam = searchParams.get("aba");

  const [tab, setTab] = useState<FinanceTab>(() =>
    isFinanceTab(tabParam) ? tabParam : wantsNewExpense ? "despesas" : "visao"
  );
  const [newExpenseOpen, setNewExpenseOpen] = useState(() => wantsNewExpense);

  // O estado local troca a aba na hora; a URL acompanha para o link continuar
  // compartilhável (`/financeiro?aba=fluxo`).
  const changeTab = useCallback(
    (next: string) => {
      const value = isFinanceTab(next) ? next : "visao";
      setTab(value);
      router.replace(value === "visao" ? pathname : `${pathname}?aba=${value}`, {
        scroll: false,
      });
    },
    [pathname, router]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Contas, despesas, fluxo de caixa e resultado — na linguagem da loja."
      />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="visao">
            <LayoutDashboard /> Visão geral
          </TabsTrigger>
          <TabsTrigger value="pagar">
            <ArrowDownCircle /> Contas a pagar
          </TabsTrigger>
          <TabsTrigger value="receber">
            <ArrowUpCircle /> Contas a receber
          </TabsTrigger>
          <TabsTrigger value="despesas">
            <Receipt /> Despesas
          </TabsTrigger>
          <TabsTrigger value="fluxo">
            <TrendingUp /> Fluxo de caixa
          </TabsTrigger>
          <TabsTrigger value="dre">
            <ScrollText /> DRE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-4">
          <OverviewTab state={state} onOpenTab={changeTab} />
        </TabsContent>
        <TabsContent value="pagar" className="mt-4">
          <PayablesTab state={state} />
        </TabsContent>
        <TabsContent value="receber" className="mt-4">
          <ReceivablesTab state={state} />
        </TabsContent>
        <TabsContent value="despesas" className="mt-4">
          <ExpensesTab
            state={state}
            newOpen={newExpenseOpen}
            onNewOpenChange={setNewExpenseOpen}
          />
        </TabsContent>
        <TabsContent value="fluxo" className="mt-4">
          <CashFlowTab state={state} />
        </TabsContent>
        <TabsContent value="dre" className="mt-4">
          <DreTab state={state} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinanceSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Carregando financeiro">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-9 w-full max-w-2xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
