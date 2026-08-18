"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { demoCompany } from "@/lib/mock";
import { cn } from "@/lib/utils";

const onboardingSchema = z.object({
  storeName: z.string().min(2, "Informe o nome da loja"),
  segment: z.string().min(1, "Escolha o segmento"),
  cnpj: z.string().optional(),
  city: z.string().min(2, "Informe a cidade"),
  state: z.string().min(2, "Informe o estado"),
  units: z.string().min(1, "Escolha o número de unidades"),
  sellers: z.string().min(1, "Escolha a quantidade de vendedores"),
  channels: z.array(z.string()).min(1, "Escolha ao menos um canal"),
  currentControl: z.string().min(1, "Escolha uma opção"),
  mainChallenge: z.string().min(1, "Escolha uma opção"),
  monthlyGoal: z.string().min(1, "Informe a meta mensal"),
  visualStyle: z.string().min(1, "Escolha um estilo"),
  productsStart: z.string().min(1, "Escolha uma opção"),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const STEPS = [
  { title: "Sobre a loja", fields: ["storeName", "segment", "cnpj"] },
  { title: "Localização e equipe", fields: ["city", "state", "units", "sellers"] },
  { title: "Canais e controle", fields: ["channels", "currentControl"] },
  { title: "Desafio e meta", fields: ["mainChallenge", "monthlyGoal"] },
  { title: "Identidade visual", fields: ["visualStyle"] },
  { title: "Primeiros produtos", fields: ["productsStart"] },
] as const;

const CHANNEL_OPTIONS = [
  "Loja física",
  "Instagram",
  "WhatsApp",
  "Site próprio",
  "Marketplaces",
];

const STYLE_OPTIONS = [
  { id: "elegante", label: "Elegante e sóbrio", swatch: ["#211623", "#8a3163", "#f3efec"] },
  { id: "clean", label: "Clean e minimalista", swatch: ["#1b1613", "#6e6862", "#faf9f7"] },
  { id: "vibrante", label: "Moderno e vibrante", swatch: ["#4a3aa7", "#e87ba4", "#f7edf3"] },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, ready, completeOnboarding } = useSession();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (ready && !session.loggedIn) router.replace("/login");
  }, [ready, session, router]);

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange",
    defaultValues: {
      storeName: "",
      segment: "Moda feminina",
      cnpj: "",
      city: "",
      state: "",
      units: "1",
      sellers: "",
      channels: [],
      currentControl: "",
      mainChallenge: "",
      monthlyGoal: "",
      visualStyle: "elegante",
      productsStart: "",
    },
  });

  const values = form.watch();
  const progress = useMemo(
    () => Math.round(((step + 1) / STEPS.length) * 100),
    [step]
  );

  const next = async () => {
    const valid = await form.trigger(
      STEPS[step].fields as unknown as (keyof OnboardingForm)[]
    );
    if (!valid) return;
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const finish = form.handleSubmit(async () => {
    setFinishing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setFinished(true);
  });

  const enterApp = (withDemo: boolean) => {
    completeOnboarding(demoCompany.id);
    if (withDemo) {
      toast.success("Dados de demonstração carregados!");
    }
    router.push("/visao-geral");
  };

  const toggleChannel = (channel: string) => {
    const current = values.channels ?? [];
    form.setValue(
      "channels",
      current.includes(channel)
        ? current.filter((c) => c !== channel)
        : [...current, channel],
      { shouldValidate: true }
    );
  };

  const err = form.formState.errors;

  if (finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <PartyPopper className="size-7" />
        </span>
        <h1 className="mt-5 max-w-md text-2xl font-semibold tracking-tight">
          Tudo pronto. Agora vamos transformar os dados da sua loja em decisões
          mais inteligentes.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {values.storeName
            ? `A ${values.storeName} já tem um espaço só dela no Lume.`
            : "Sua loja já tem um espaço só dela no Lume."}
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-2">
          <Button size="lg" onClick={() => enterApp(true)}>
            <Sparkles /> Explorar com dados de demonstração
          </Button>
          <Button variant="outline" size="lg" onClick={() => enterApp(false)}>
            Começar do zero
          </Button>
        </div>
        <p className="mt-4 max-w-sm text-xs text-muted-foreground">
          Nesta demonstração, as duas opções abrem a loja Bella Moda Feminina com
          dados fictícios.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col p-6">
      <div className="flex items-center justify-between">
        <Brand size="sm" />
        <span className="text-xs text-muted-foreground">
          Etapa {step + 1} de {STEPS.length}
        </span>
      </div>
      <Progress value={progress} className="mt-4" aria-label={`Progresso: ${progress}%`} />

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-8 flex flex-1 flex-col"
        noValidate
      >
        <h1 className="text-xl font-semibold tracking-tight">{STEPS[step].title}</h1>

        <div className="mt-5 flex-1 space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="storeName">Nome da loja</Label>
                <Input
                  id="storeName"
                  placeholder="Ex.: Bella Moda Feminina"
                  aria-invalid={!!err.storeName}
                  {...form.register("storeName")}
                />
                {err.storeName && (
                  <p className="text-xs text-destructive">{err.storeName.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Segmento</Label>
                <Select
                  value={values.segment}
                  onValueChange={(v) => form.setValue("segment", v, { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Moda feminina", "Moda masculina", "Moda infantil", "Calçados", "Acessórios", "Multimarcas"].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">
                  CNPJ <span className="font-normal text-muted-foreground">(opcional)</span>
                </Label>
                <Input id="cnpj" placeholder="00.000.000/0000-00" {...form.register("cnpj")} />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Ex.: Campinas"
                    aria-invalid={!!err.city}
                    {...form.register("city")}
                  />
                  {err.city && <p className="text-xs text-destructive">{err.city.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={values.state}
                    onValueChange={(v) => form.setValue("state", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!err.state}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {["SP", "RJ", "MG", "PR", "SC", "RS", "GO", "BA", "PE", "CE", "DF", "ES", "MT", "MS", "PA", "AM"].map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err.state && <p className="text-xs text-destructive">{err.state.message}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Número de unidades</Label>
                <div className="flex gap-2">
                  {["1", "2", "3 ou mais"].map((option) => (
                    <ChoiceChip
                      key={option}
                      selected={values.units === option}
                      onClick={() => form.setValue("units", option, { shouldValidate: true })}
                    >
                      {option}
                    </ChoiceChip>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade de vendedores</Label>
                <div className="flex flex-wrap gap-2">
                  {["Só eu", "1 a 2", "3 a 5", "6 ou mais"].map((option) => (
                    <ChoiceChip
                      key={option}
                      selected={values.sellers === option}
                      onClick={() => form.setValue("sellers", option, { shouldValidate: true })}
                    >
                      {option}
                    </ChoiceChip>
                  ))}
                </div>
                {err.sellers && <p className="text-xs text-destructive">{err.sellers.message}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Onde você vende hoje?</Label>
                <p className="text-xs text-muted-foreground">Escolha todos que se aplicam.</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CHANNEL_OPTIONS.map((channel) => (
                    <ChoiceChip
                      key={channel}
                      selected={values.channels?.includes(channel)}
                      onClick={() => toggleChannel(channel)}
                    >
                      {values.channels?.includes(channel) && <Check className="size-3.5" />}
                      {channel}
                    </ChoiceChip>
                  ))}
                </div>
                {err.channels && (
                  <p className="text-xs text-destructive">{err.channels.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Como você controla a loja hoje?</Label>
                <div className="flex flex-wrap gap-2">
                  {["Caderno", "Planilhas", "Sistema genérico", "Não tenho controle"].map((option) => (
                    <ChoiceChip
                      key={option}
                      selected={values.currentControl === option}
                      onClick={() =>
                        form.setValue("currentControl", option, { shouldValidate: true })
                      }
                    >
                      {option}
                    </ChoiceChip>
                  ))}
                </div>
                {err.currentControl && (
                  <p className="text-xs text-destructive">{err.currentControl.message}</p>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-1.5">
                <Label>Qual é a principal dificuldade da loja?</Label>
                <div className="grid gap-2">
                  {[
                    "Saber se estou realmente lucrando",
                    "Controlar o estoque por tamanho e cor",
                    "Vender mais para quem já é cliente",
                    "Organizar o financeiro e as contas",
                    "Acompanhar as vendedoras e comissões",
                  ].map((option) => (
                    <ChoiceChip
                      key={option}
                      selected={values.mainChallenge === option}
                      onClick={() =>
                        form.setValue("mainChallenge", option, { shouldValidate: true })
                      }
                      className="w-full justify-start"
                    >
                      {option}
                    </ChoiceChip>
                  ))}
                </div>
                {err.mainChallenge && (
                  <p className="text-xs text-destructive">{err.mainChallenge.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthlyGoal">Meta de faturamento mensal</Label>
                <Input
                  id="monthlyGoal"
                  inputMode="numeric"
                  placeholder="Ex.: R$ 60.000"
                  aria-invalid={!!err.monthlyGoal}
                  {...form.register("monthlyGoal")}
                />
                {err.monthlyGoal && (
                  <p className="text-xs text-destructive">{err.monthlyGoal.message}</p>
                )}
              </div>
            </>
          )}

          {step === 4 && (
            <div className="space-y-1.5">
              <Label>Escolha o estilo visual da sua loja</Label>
              <p className="text-xs text-muted-foreground">
                Você poderá refinar cores e logo depois, nas configurações.
              </p>
              <div className="grid gap-2 pt-1">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() =>
                      form.setValue("visualStyle", style.id, { shouldValidate: true })
                    }
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      values.visualStyle === style.id
                        ? "border-primary bg-accent"
                        : "hover:bg-secondary"
                    )}
                  >
                    <span className="flex gap-1">
                      {style.swatch.map((color) => (
                        <span
                          key={color}
                          className="size-5 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                    <span className="flex-1 font-medium">{style.label}</span>
                    {values.visualStyle === style.id && (
                      <Check className="size-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-1.5">
              <Label>Como você quer começar?</Label>
              <div className="grid gap-2 pt-1">
                {[
                  {
                    id: "demo",
                    title: "Usar dados de demonstração",
                    text: "Explore o sistema com uma loja fictícia completa (recomendado).",
                  },
                  {
                    id: "manual",
                    title: "Cadastrar meus produtos agora",
                    text: "Comece do zero cadastrando as primeiras peças.",
                  },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      form.setValue("productsStart", option.id, { shouldValidate: true })
                    }
                    className={cn(
                      "rounded-lg border p-3.5 text-left transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      values.productsStart === option.id
                        ? "border-primary bg-accent"
                        : "hover:bg-secondary"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {option.title}
                      {values.productsStart === option.id && (
                        <Check className="size-4 text-primary" />
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {option.text}
                    </span>
                  </button>
                ))}
              </div>
              {err.productsStart && (
                <p className="text-xs text-destructive">{err.productsStart.message}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 pb-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 0 ? router.push("/selecionar-empresa") : setStep(step - 1))}
          >
            <ArrowLeft /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next}>
              Continuar <ArrowRight />
            </Button>
          ) : (
            <Button type="button" onClick={finish} disabled={finishing}>
              {finishing && <Loader2 className="animate-spin" />}
              Concluir configuração
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function ChoiceChip({
  selected,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-accent font-medium text-accent-foreground"
          : "hover:bg-secondary",
        className
      )}
    >
      {children}
    </button>
  );
}
