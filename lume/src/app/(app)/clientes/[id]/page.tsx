"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  BellRing,
  CalendarClock,
  History,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  TicketPercent,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CouponDialog } from "@/components/clientes/coupon-dialog";
import { CustomerBalanceCard } from "@/components/clientes/customer-balance-card";
import { CustomerDetails } from "@/components/clientes/customer-details";
import {
  CustomerForm,
  customerToFormValues,
  formValuesToCustomer,
  type CustomerFormValues,
} from "@/components/clientes/customer-form";
import { CustomerMessageDialog } from "@/components/clientes/customer-message-dialog";
import { CustomerPurchases } from "@/components/clientes/customer-purchases";
import { CustomerTimeline } from "@/components/clientes/customer-timeline";
import { InteractionDialog } from "@/components/clientes/interaction-dialog";
import {
  CUSTOMER_SEGMENT_LABELS,
  CUSTOMER_SEGMENT_VARIANT,
} from "@/components/clientes/segments";
import { useStore } from "@/hooks/use-store";
import { updateCustomer } from "@/lib/store";
import { customerStats } from "@/lib/metrics";
import { formatBRL, formatDate, formatNumber, initials } from "@/lib/format";

export default function ClientePerfilPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const state = useStore();

  const customerId = typeof params.id === "string" ? params.id : "";
  const [messageOpen, setMessageOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const stat = useMemo(
    () => customerStats(state).find((item) => item.customer.id === customerId),
    [state, customerId]
  );

  const sales = useMemo(
    () =>
      state.sales
        .filter((sale) => sale.customerId === customerId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.sales, customerId]
  );

  const interactions = useMemo(
    () =>
      state.interactions
        .filter((interaction) => interaction.customerId === customerId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.interactions, customerId]
  );

  const receivables = useMemo(
    () =>
      state.receivables
        .filter(
          (receivable) =>
            receivable.customerId === customerId && receivable.status !== "recebido"
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [state.receivables, customerId]
  );

  if (!stat) {
    return (
      <div className="space-y-5">
        <PageHeader title="Cliente não encontrada" />
        <EmptyState
          icon={UserRoundX}
          title="Esta cliente não existe mais"
          description="O cadastro pode ter sido removido ou o endereço está incorreto."
          action={
            <Button asChild size="sm">
              <Link href="/clientes">
                <ArrowLeft /> Voltar para a lista
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const customer = stat.customer;
  const seller = state.sellers.find((item) => item.id === customer.sellerId);

  const saveCustomer = async (values: CustomerFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    updateCustomer(customer.id, formValuesToCustomer(values));
    toast.success("Dados atualizados", {
      description: `O cadastro de ${values.name.trim()} foi salvo.`,
    });
  };

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/clientes">
          <ArrowLeft /> Clientes
        </Link>
      </Button>

      <PageHeader
        title={customer.name}
        actions={
          <>
            <Button variant="secondary" onClick={() => setMessageOpen(true)}>
              <MessageCircle /> Enviar WhatsApp
            </Button>
            <Button variant="secondary" onClick={() => setCouponOpen(true)}>
              <TicketPercent /> Oferecer cupom
            </Button>
            <Button variant="outline" onClick={() => setReminderOpen(true)}>
              <BellRing /> Criar lembrete
            </Button>
          </>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary text-sm text-primary-foreground">
              {initials(customer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={CUSTOMER_SEGMENT_VARIANT[stat.segment]}>
                {CUSTOMER_SEGMENT_LABELS[stat.segment]}
              </Badge>
              <Badge variant="outline">Tamanho {customer.preferredSize}</Badge>
              {stat.favoriteCategory ? (
                <Badge variant="outline">Gosta de {stat.favoriteCategory}</Badge>
              ) : null}
              {customer.marketingConsent ? null : (
                <Badge variant="warning">Sem consentimento de marketing</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5" /> {customer.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />{" "}
                {customer.city || "Cidade não informada"}
              </span>
              {customer.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {customer.email}
                </span>
              ) : null}
              {customer.instagram ? (
                <span className="inline-flex items-center gap-1.5">
                  <AtSign className="size-3.5" /> {customer.instagram}
                </span>
              ) : null}
              {customer.birthday ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" /> Aniversário em{" "}
                  {customer.birthday}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <section
        aria-label="Indicadores da cliente"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Total gasto"
          value={formatBRL(stat.totalSpent)}
          icon={ShoppingBag}
          hint="Soma de todas as compras finalizadas desta cliente."
        />
        <StatCard
          label="Compras"
          value={formatNumber(stat.purchases)}
          icon={History}
          hint={`${formatNumber(stat.pieces)} peças levadas no total.`}
        />
        <StatCard
          label="Ticket médio"
          value={stat.purchases > 0 ? formatBRL(stat.ticket) : "—"}
          icon={TicketPercent}
        />
        <StatCard
          label="Última compra"
          value={
            stat.daysSinceLastPurchase !== null
              ? `há ${formatNumber(stat.daysSinceLastPurchase)} dias`
              : "Nunca"
          }
          icon={CalendarClock}
          hint={
            stat.lastPurchase
              ? `Última venda em ${formatDate(stat.lastPurchase)}.`
              : "Cadastrada, mas ainda sem compra registrada."
          }
        />
      </section>

      {stat.openBalance > 0 && receivables.length > 0 ? (
        <CustomerBalanceCard receivables={receivables} total={stat.openBalance} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CustomerDetails stat={stat} sellerName={seller?.name} />
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="compras" className="space-y-4">
            <TabsList>
              <TabsTrigger value="compras">
                <ShoppingBag /> Compras
              </TabsTrigger>
              <TabsTrigger value="atendimentos">
                <MessageCircle /> Atendimentos
              </TabsTrigger>
              <TabsTrigger value="dados">
                <Users /> Dados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compras" className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {sales.length > 0
                  ? `${formatNumber(sales.length)} ${sales.length === 1 ? "venda registrada" : "vendas registradas"} — clique para abrir o detalhe.`
                  : "Nenhuma venda registrada para esta cliente."}
              </p>
              <CustomerPurchases
                sales={sales}
                onSelect={(sale) => router.push(`/vendas/${sale.id}`)}
              />
            </TabsContent>

            <TabsContent value="atendimentos">
              <CustomerTimeline customer={customer} interactions={interactions} />
            </TabsContent>

            <TabsContent value="dados">
              <Card>
                <CardHeader>
                  <CardTitle>Editar cadastro</CardTitle>
                  <CardDescription>
                    Manter tamanho, preferências e consentimento em dia é o que faz
                    as campanhas acertarem o alvo.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    key={customer.id}
                    defaultValues={customerToFormValues(customer)}
                    submitLabel="Salvar alterações"
                    onSubmit={saveCustomer}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CustomerMessageDialog
        open={messageOpen}
        onOpenChange={setMessageOpen}
        stat={stat}
        storeName={state.company.tradeName}
      />

      <CouponDialog open={couponOpen} onOpenChange={setCouponOpen} stat={stat} />

      <InteractionDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        customer={customer}
        defaultType="lembrete"
        title="Criar lembrete"
        description="Um lembrete para a equipe: o que fazer e quando falar com esta cliente."
      />
    </div>
  );
}
