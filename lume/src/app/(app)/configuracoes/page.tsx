"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgeCheck,
  Building2,
  Check,
  Database,
  History,
  Loader2,
  Lock,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Target,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Field } from "@/components/form-field";
import { useConfirm } from "@/components/confirm-dialog";
import { DataTable } from "@/components/data-table";
import { useStore } from "@/hooks/use-store";
import {
  resetState,
  updateCompany,
  updateGoal,
  updateSellerGoal,
  updateSettings,
} from "@/lib/store";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { formatBRL, formatDateTime } from "@/lib/format";
import { monthKey } from "@/lib/dates";
import { DEMO_TODAY } from "@/lib/dates";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const companySchema = z.object({
  tradeName: z.string().min(2, "Informe o nome fantasia"),
  name: z.string().min(2, "Informe a razão social"),
  cnpj: z.string().optional(),
  phone: z.string().min(8, "Informe um telefone"),
  instagram: z.string().optional(),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().min(2, "UF"),
});

type CompanyForm = z.infer<typeof companySchema>;

const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: "R$ 89/mês",
    description: "Para começar a organizar as vendas e o estoque.",
    features: ["1 unidade", "2 usuários", "Vendas e estoque", "Relatórios básicos"],
  },
  {
    id: "gestao",
    name: "Gestão",
    price: "R$ 169/mês",
    description: "Para quem quer enxergar lucro, metas e clientes.",
    features: [
      "2 unidades",
      "6 usuários",
      "Financeiro completo + DRE",
      "CRM e campanhas",
      "Alertas inteligentes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 299/mês",
    description: "Para operações maiores e multiunidade.",
    features: [
      "Unidades ilimitadas",
      "Usuários ilimitados",
      "Catálogo com pedidos",
      "Permissões avançadas",
      "Suporte prioritário",
    ],
  },
] as const;

export default function SettingsPage() {
  const state = useStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { confirm, dialog } = useConfirm();
  const [saving, setSaving] = useState(false);

  const currentMonth = monthKey(DEMO_TODAY);
  const goal = state.goals.find((g) => g.month === currentMonth);

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      tradeName: state.company.tradeName,
      name: state.company.name,
      cnpj: state.company.cnpj,
      phone: state.company.phone,
      instagram: state.company.instagram,
      city: state.company.city,
      state: state.company.state,
    },
  });

  const save = form.handleSubmit(async (values) => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    updateCompany(values);
    setSaving(false);
    toast.success("Dados da loja salvos com sucesso!");
  });

  const err = form.formState.errors;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações"
        description="Dados da loja, metas, equipe, plano e histórico de atividades."
      />

      <Tabs defaultValue="loja">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="loja">
            <Building2 /> Loja
          </TabsTrigger>
          <TabsTrigger value="metas">
            <Target /> Metas
          </TabsTrigger>
          <TabsTrigger value="aparencia">
            <Palette /> Aparência
          </TabsTrigger>
          <TabsTrigger value="equipe">
            <Users /> Equipe
          </TabsTrigger>
          <TabsTrigger value="plano">
            <BadgeCheck /> Plano
          </TabsTrigger>
          <TabsTrigger value="atividades">
            <History /> Atividades
          </TabsTrigger>
          <TabsTrigger value="dados">
            <Database /> Dados
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------ Loja ------------------------------ */}
        <TabsContent value="loja" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
              <CardDescription>
                Informações usadas em comprovantes, catálogo e relatórios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Field label="Nome fantasia" htmlFor="tradeName" required error={err.tradeName?.message}>
                  <Input id="tradeName" {...form.register("tradeName")} />
                </Field>
                <Field label="Razão social" htmlFor="name" required error={err.name?.message}>
                  <Input id="name" {...form.register("name")} />
                </Field>
                <Field label="CNPJ" htmlFor="cnpj">
                  <Input id="cnpj" {...form.register("cnpj")} />
                </Field>
                <Field label="Telefone / WhatsApp" htmlFor="phone" required error={err.phone?.message}>
                  <Input id="phone" {...form.register("phone")} />
                </Field>
                <Field label="Instagram" htmlFor="instagram">
                  <Input id="instagram" {...form.register("instagram")} />
                </Field>
                <div className="grid grid-cols-[1fr_5rem] gap-3">
                  <Field label="Cidade" htmlFor="city" required error={err.city?.message}>
                    <Input id="city" {...form.register("city")} />
                  </Field>
                  <Field label="UF" htmlFor="state" required error={err.state?.message}>
                    <Input id="state" maxLength={2} {...form.register("state")} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="animate-spin" />}
                    Salvar alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regras financeiras</CardTitle>
              <CardDescription>
                Usadas nos cálculos de margem, DRE e alertas.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Taxa média de cartão (%)"
                htmlFor="cardFee"
                required
                hint="Cobrada pela maquininha"
              >
                <Input
                  id="cardFee"
                  type="number"
                  step="0.1"
                  defaultValue={state.settings.cardFeePercent}
                  onBlur={(e) =>
                    updateSettings({ cardFeePercent: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                label="Imposto sobre vendas (%)"
                htmlFor="tax"
                required
                hint="Ex.: Simples Nacional"
              >
                <Input
                  id="tax"
                  type="number"
                  step="0.1"
                  defaultValue={state.settings.taxPercent}
                  onBlur={(e) =>
                    updateSettings({ taxPercent: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                label="Desconto máximo (%)"
                htmlFor="maxDiscount"
                required
                hint="Acima disso, a venda mostra um aviso"
              >
                <Input
                  id="maxDiscount"
                  type="number"
                  step="1"
                  defaultValue={state.settings.maxDiscountPercent}
                  onBlur={(e) =>
                    updateSettings({ maxDiscountPercent: Number(e.target.value) })
                  }
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>O que você quer receber como alerta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  { id: "stock", label: "Estoque baixo e produtos parados" },
                  { id: "goal", label: "Progresso da meta mensal" },
                  { id: "finance", label: "Contas a vencer e caixa previsto" },
                ] as const
              ).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`nt-${item.id}`} className="font-normal">
                    {item.label}
                  </Label>
                  <Switch
                    id={`nt-${item.id}`}
                    checked={state.settings.notifications[item.id]}
                    onCheckedChange={(checked) => {
                      updateSettings({
                        notifications: {
                          ...state.settings.notifications,
                          [item.id]: checked,
                        },
                      });
                      toast.success(
                        checked ? "Notificação ativada" : "Notificação desativada"
                      );
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Metas ----------------------------- */}
        <TabsContent value="metas" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta da loja</CardTitle>
              <CardDescription>
                Faturamento que a loja quer atingir em agosto de 2026.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Meta mensal (R$)" htmlFor="goal" required className="w-56">
                  <Input
                    id="goal"
                    type="number"
                    step="1000"
                    defaultValue={goal?.revenueTarget ?? 0}
                    onBlur={(e) => {
                      updateGoal(currentMonth, Number(e.target.value));
                      toast.success("Meta atualizada");
                    }}
                  />
                </Field>
                <p className="pb-2 text-sm text-muted-foreground">
                  Equivale a {formatBRL((goal?.revenueTarget ?? 0) / 26)} por dia útil.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metas das vendedoras</CardTitle>
              <CardDescription>
                A soma das metas individuais é a base do acompanhamento da equipe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.sellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {seller.commissionRule.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`goal-${seller.id}`} className="text-xs text-muted-foreground">
                      Meta
                    </Label>
                    <Input
                      id={`goal-${seller.id}`}
                      type="number"
                      step="500"
                      className="w-32"
                      defaultValue={seller.monthlyGoal}
                      onBlur={(e) => {
                        updateSellerGoal(seller.id, Number(e.target.value));
                        toast.success(`Meta de ${seller.name.split(" ")[0]} atualizada`);
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Soma das metas individuais:{" "}
                <span className="font-medium text-foreground">
                  {formatBRL(
                    state.sellers.reduce((sum, s) => sum + s.monthlyGoal, 0)
                  )}
                </span>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- Aparência --------------------------- */}
        <TabsContent value="aparencia" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema</CardTitle>
              <CardDescription>
                O modo claro é o padrão; o escuro é ideal para o fim do dia.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              {[
                { id: "light", label: "Claro", icon: Sun },
                { id: "dark", label: "Escuro", icon: Moon },
              ].map((themeOption) => (
                <button
                  key={themeOption.id}
                  onClick={() => setTheme(themeOption.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:max-w-40",
                    resolvedTheme === themeOption.id
                      ? "border-primary bg-accent"
                      : "hover:bg-secondary"
                  )}
                >
                  <themeOption.icon className="size-5" />
                  {themeOption.label}
                  {resolvedTheme === themeOption.id && (
                    <Check className="size-4 text-primary" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- Equipe ----------------------------- */}
        <TabsContent value="equipe" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários</CardTitle>
              <CardDescription>Quem tem acesso a esta loja.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Rafael Fernandes</p>
                  <p className="text-xs text-muted-foreground">demo@lume.app</p>
                </div>
                <Badge>Proprietário</Badge>
              </div>
              {state.sellers.map((seller) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Comissão: {seller.commissionRule.description}
                    </p>
                  </div>
                  <Badge variant="secondary">Vendedor</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissões por cargo</CardTitle>
              <CardDescription>
                O que cada perfil pode fazer. As mesmas regras valem no banco de
                dados, então o acesso é bloqueado mesmo fora da interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                  <div key={role} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{ROLE_LABELS[role]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ROLE_PERMISSIONS[role].length} permissões
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {[
                        ...new Set(
                          ROLE_PERMISSIONS[role].map((p) => p.split(".")[0])
                        ),
                      ].map((area) => (
                        <Badge key={area} variant="secondary" className="capitalize">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Plano ------------------------------ */}
        <TabsContent value="plano" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === state.company.plan;
              return (
                <Card
                  key={plan.id}
                  className={cn("flex flex-col p-5", isCurrent && "border-primary")}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{plan.name}</p>
                    {isCurrent && <Badge>Plano atual</Badge>}
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    {plan.price}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-success-text" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5"
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent}
                    onClick={() => {
                      updateCompany({ plan: plan.id });
                      toast.success(`Plano alterado para ${plan.name}`, {
                        description: "Nesta demonstração não há cobrança.",
                      });
                    }}
                  >
                    {isCurrent ? "Este é o seu plano" : "Escolher plano"}
                  </Button>
                </Card>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tela demonstrativa — valores ilustrativos, sem cobrança real.
          </p>
        </TabsContent>

        {/* --------------------------- Atividades ---------------------------- */}
        <TabsContent value="atividades" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Histórico de atividades</CardTitle>
                <CardDescription>
                  Quem fez o quê, e quando. Suas ações no sistema aparecem aqui em
                  tempo real.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <ShieldCheck /> Auditoria
              </Badge>
            </CardHeader>
            <CardContent>
              <DataTable
                rows={state.activityLog.slice(0, 40)}
                getRowId={(row) => row.id}
                columns={[
                  {
                    id: "action",
                    header: "Ação",
                    primary: true,
                    cell: (row) => row.action,
                  },
                  {
                    id: "detail",
                    header: "Detalhe",
                    secondary: true,
                    cell: (row) => row.detail,
                  },
                  {
                    id: "entity",
                    header: "Módulo",
                    cell: (row) => <Badge variant="outline">{row.entity}</Badge>,
                  },
                  {
                    id: "user",
                    header: "Responsável",
                    cell: (row) => row.userName,
                  },
                  {
                    id: "date",
                    header: "Data",
                    align: "right",
                    cell: (row) => formatDateTime(row.date),
                  },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Lock className="size-4" /> Segurança e privacidade
              </CardTitle>
              <CardDescription>
                O sistema já está preparado para: autorização por cargo,
                isolamento entre empresas no banco de dados, exclusão lógica,
                registro de alterações com valor anterior e novo, consentimento
                de comunicação (LGPD) e exportação de dados do cliente.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* ------------------------------ Dados ------------------------------ */}
        <TabsContent value="dados" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados da demonstração</CardTitle>
              <CardDescription>
                Tudo o que você faz no sistema fica salvo neste navegador. Use o
                botão abaixo para voltar à base original a qualquer momento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Produtos", value: state.products.length },
                  { label: "Variações", value: state.variants.length },
                  { label: "Clientes", value: state.customers.length },
                  { label: "Vendas", value: state.sales.length },
                  { label: "Movimentações", value: state.stockMovements.length },
                  { label: "Despesas", value: state.expenses.length },
                  { label: "Contas a pagar", value: state.payables.length },
                  { label: "Contas a receber", value: state.receivables.length },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() =>
                  confirm({
                    title: "Restaurar dados de demonstração?",
                    description:
                      "Todas as vendas, produtos e alterações que você fez nesta demonstração serão descartados, e a loja volta ao estado original.",
                    confirmLabel: "Restaurar",
                    destructive: true,
                    onConfirm: () => {
                      resetState();
                      toast.success("Dados de demonstração restaurados");
                    },
                  })
                }
              >
                <RotateCcw /> Restaurar dados originais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog}
    </div>
  );
}
