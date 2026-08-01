"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BadgeCheck,
  Building2,
  Check,
  History,
  Loader2,
  Lock,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
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
import { useComingSoon } from "@/components/coming-soon";
import { demoActivityLog, demoCompany, demoSellers, demoUnits } from "@/lib/mock";
import { ROLE_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
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
  const comingSoon = useComingSoon();
  const { resolvedTheme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [notifyStock, setNotifyStock] = useState(true);
  const [notifyGoal, setNotifyGoal] = useState(true);
  const [notifyFinance, setNotifyFinance] = useState(false);

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      tradeName: demoCompany.tradeName,
      name: demoCompany.name,
      cnpj: demoCompany.cnpj,
      phone: demoCompany.phone,
      instagram: demoCompany.instagram,
      city: demoCompany.city,
      state: demoCompany.state,
    },
  });

  const save = form.handleSubmit(async () => {
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSaving(false);
    toast.success("Dados da loja salvos com sucesso!");
  });

  const err = form.formState.errors;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações"
        description="Dados da loja, aparência, plano e histórico de atividades."
      />

      <Tabs defaultValue="loja">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="loja">
            <Building2 /> Loja
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
                <div className="space-y-1.5">
                  <Label htmlFor="tradeName">Nome fantasia</Label>
                  <Input id="tradeName" aria-invalid={!!err.tradeName} {...form.register("tradeName")} />
                  {err.tradeName && <p className="text-xs text-destructive">{err.tradeName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Razão social</Label>
                  <Input id="name" aria-invalid={!!err.name} {...form.register("name")} />
                  {err.name && <p className="text-xs text-destructive">{err.name.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" {...form.register("cnpj")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" aria-invalid={!!err.phone} {...form.register("phone")} />
                  {err.phone && <p className="text-xs text-destructive">{err.phone.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" {...form.register("instagram")} />
                </div>
                <div className="grid grid-cols-[1fr_5rem] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" aria-invalid={!!err.city} {...form.register("city")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">UF</Label>
                    <Input id="state" aria-invalid={!!err.state} {...form.register("state")} />
                  </div>
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
              <CardTitle>Unidades</CardTitle>
              <CardDescription>Endereços físicos da operação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {demoUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {unit.name}{" "}
                      {unit.isMain && (
                        <Badge variant="accent" className="ml-1">
                          Principal
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{unit.address}</p>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  comingSoon.show("Nova unidade", 5, "O cadastro de novas unidades chega junto com o multiempresa completo.")
                }
              >
                Adicionar unidade
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>O que você quer receber como alerta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  id: "stock",
                  label: "Estoque baixo e produtos parados",
                  checked: notifyStock,
                  onChange: setNotifyStock,
                },
                {
                  id: "goal",
                  label: "Progresso da meta mensal",
                  checked: notifyGoal,
                  onChange: setNotifyGoal,
                },
                {
                  id: "finance",
                  label: "Contas a vencer e caixa previsto",
                  checked: notifyFinance,
                  onChange: setNotifyFinance,
                },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`nt-${item.id}`} className="font-normal">
                    {item.label}
                  </Label>
                  <Switch
                    id={`nt-${item.id}`}
                    checked={item.checked}
                    onCheckedChange={(checked) => {
                      item.onChange(checked);
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

          <Card>
            <CardHeader>
              <CardTitle>Identidade visual da loja</CardTitle>
              <CardDescription>
                Logo, cores e banner aparecem no catálogo virtual e nos comprovantes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() =>
                  comingSoon.show(
                    "Personalização do catálogo",
                    4,
                    "Upload de logo, banner e cores da sua marca chegam junto com o catálogo virtual."
                  )
                }
              >
                Personalizar identidade
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- Equipe ----------------------------- */}
        <TabsContent value="equipe" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários e cargos</CardTitle>
              <CardDescription>
                Perfis previstos: {Object.values(ROLE_LABELS).join(", ")}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Rafael Fernandes</p>
                  <p className="text-xs text-muted-foreground">demo@lume.app</p>
                </div>
                <Badge>Proprietário</Badge>
              </div>
              {demoSellers.map((seller) => (
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  comingSoon.show(
                    "Convite de usuários e permissões",
                    5,
                    "Permissões finas por cargo (caixa, estoquista, financeiro) chegam na etapa de segurança."
                  )
                }
              >
                Convidar usuário
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------ Plano ------------------------------ */}
        <TabsContent value="plano" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === demoCompany.plan;
              return (
                <Card
                  key={plan.id}
                  className={cn("flex flex-col p-5", isCurrent && "border-primary")}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{plan.name}</p>
                    {isCurrent && <Badge>Plano atual</Badge>}
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{plan.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
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
                    onClick={() =>
                      comingSoon.show(
                        `Assinar plano ${plan.name}`,
                        5,
                        "A contratação de planos (com cobrança real) faz parte da preparação para produção."
                      )
                    }
                  >
                    {isCurrent ? "Este é o seu plano" : "Escolher plano"}
                  </Button>
                </Card>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tela demonstrativa — valores ilustrativos, sem cobrança.
          </p>
        </TabsContent>

        {/* --------------------------- Atividades ---------------------------- */}
        <TabsContent value="atividades" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Histórico de atividades</CardTitle>
                <CardDescription>
                  Auditoria da operação: quem fez o quê, e quando (dados simulados).
                </CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <ShieldCheck /> LGPD
              </Badge>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-4">
                {demoActivityLog.slice(0, 18).map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary/60" />
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <Badge variant="outline">{entry.entity}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.date)} · {entry.userName}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{entry.detail}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Lock className="size-4" /> Segurança e privacidade
              </CardTitle>
              <CardDescription>
                Preparado para: autorização por função, isolamento entre empresas,
                exclusão lógica, exportação e anonimização de dados de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  comingSoon.show(
                    "Políticas de acesso e LGPD",
                    5,
                    "Logs completos com IP, exportação de dados e anonimização chegam na etapa de produção."
                  )
                }
              >
                Configurar políticas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {comingSoon.dialog}
    </div>
  );
}
