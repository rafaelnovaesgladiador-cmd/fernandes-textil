"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form-field";
import { useStore } from "@/hooks/use-store";
import type { Customer, ProductSize } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Formulário de cliente usado no cadastro e na aba "Dados" do perfil.
 * Guarda o que muda a conversa da loja: tamanho, preferências, origem e o
 * consentimento de comunicação exigido pela LGPD.
 */

export const PREFERENCE_OPTIONS = [
  "Vestidos",
  "Alfaiataria",
  "Jeans",
  "Peças atemporais",
  "Tricô",
  "Acessórios",
  "Cores neutras",
  "Estampas florais",
  "Linho",
];

export const SIZE_OPTIONS: ProductSize[] = ["P", "M", "G", "GG", "U"];

export const ORIGIN_LABELS: Record<Customer["origin"], string> = {
  loja: "Loja física",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  indicacao: "Indicação de outra cliente",
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const NO_SELLER = "sem_vendedora";
const NOT_INFORMED = "0";

const customerSchema = z.object({
  name: z.string().min(2, "Informe o nome da cliente"),
  phone: z.string().min(8, "Informe o telefone com DDD"),
  email: z.union([z.literal(""), z.email("Informe um e-mail válido")]).optional(),
  birthdayDay: z.string(),
  birthdayMonth: z.string(),
  city: z.string(),
  instagram: z.string(),
  preferredSize: z.enum(["P", "M", "G", "GG", "U"]),
  preferences: z.array(z.string()),
  sellerId: z.string(),
  origin: z.enum(["loja", "instagram", "whatsapp", "indicacao"]),
  notes: z.string(),
  marketingConsent: z.boolean(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const EMPTY_CUSTOMER: CustomerFormValues = {
  name: "",
  phone: "",
  email: "",
  birthdayDay: NOT_INFORMED,
  birthdayMonth: NOT_INFORMED,
  city: "",
  instagram: "",
  preferredSize: "M",
  preferences: [],
  sellerId: NO_SELLER,
  origin: "loja",
  notes: "",
  marketingConsent: true,
};

export function customerToFormValues(customer: Customer): CustomerFormValues {
  const [day, month] = (customer.birthday ?? "").split("/");
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    birthdayDay: day ? String(Number(day)) : NOT_INFORMED,
    birthdayMonth: month ? String(Number(month)) : NOT_INFORMED,
    city: customer.city,
    instagram: customer.instagram ?? "",
    preferredSize: customer.preferredSize,
    preferences: customer.preferences,
    sellerId: customer.sellerId ?? NO_SELLER,
    origin: customer.origin,
    notes: customer.notes ?? "",
    marketingConsent: customer.marketingConsent,
  };
}

/** Converte o formulário no formato guardado no estado da loja. */
export function formValuesToCustomer(
  values: CustomerFormValues
): Omit<Customer, "id" | "companyId" | "createdAt"> {
  const birthday =
    values.birthdayDay !== NOT_INFORMED && values.birthdayMonth !== NOT_INFORMED
      ? `${values.birthdayDay.padStart(2, "0")}/${values.birthdayMonth.padStart(2, "0")}`
      : undefined;

  return {
    name: values.name.trim(),
    phone: values.phone.trim(),
    whatsapp: values.phone.trim(),
    email: values.email?.trim() ? values.email.trim() : undefined,
    birthday,
    city: values.city.trim(),
    instagram: values.instagram.trim() ? values.instagram.trim() : undefined,
    preferredSize: values.preferredSize,
    preferences: values.preferences,
    notes: values.notes.trim() ? values.notes.trim() : undefined,
    sellerId: values.sellerId === NO_SELLER ? undefined : values.sellerId,
    origin: values.origin,
    marketingConsent: values.marketingConsent,
  };
}

export function CustomerForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  showConsentExplanation = true,
}: {
  defaultValues: CustomerFormValues;
  submitLabel: string;
  onSubmit: (values: CustomerFormValues) => void | Promise<void>;
  onCancel?: () => void;
  showConsentExplanation?: boolean;
}) {
  const state = useStore();
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  });

  const errors = form.formState.errors;
  const preferences = form.watch("preferences");
  const consent = form.watch("marketingConsent");

  const preferenceOptions = useMemo(
    () => [...new Set([...PREFERENCE_OPTIONS, ...defaultValues.preferences])],
    [defaultValues.preferences]
  );

  const togglePreference = (option: string) => {
    const current = form.getValues("preferences");
    form.setValue(
      "preferences",
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
      { shouldDirty: true }
    );
  };

  const submit = form.handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo" htmlFor="cliente-nome" required error={errors.name?.message}>
          <Input
            id="cliente-nome"
            autoComplete="name"
            placeholder="Ex.: Mariana Alves"
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
        </Field>

        <Field
          label="Telefone / WhatsApp"
          htmlFor="cliente-telefone"
          required
          error={errors.phone?.message}
          hint="É por aqui que a loja avisa de novidades e peças separadas."
        >
          <Input
            id="cliente-telefone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(19) 99999-0000"
            aria-invalid={!!errors.phone}
            {...form.register("phone")}
          />
        </Field>

        <Field label="E-mail" htmlFor="cliente-email" error={errors.email?.message}>
          <Input
            id="cliente-email"
            type="email"
            autoComplete="email"
            placeholder="nome@email.com"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
        </Field>

        <Field label="Cidade" htmlFor="cliente-cidade">
          <Input
            id="cliente-cidade"
            autoComplete="address-level2"
            placeholder="Ex.: Campinas"
            {...form.register("city")}
          />
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="cliente-aniversario-dia">
            Aniversário
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={form.watch("birthdayDay")}
              onValueChange={(v) => form.setValue("birthdayDay", v, { shouldDirty: true })}
            >
              <SelectTrigger id="cliente-aniversario-dia" className="w-full" aria-label="Dia do aniversário">
                <SelectValue placeholder="Dia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOT_INFORMED}>Dia</SelectItem>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.watch("birthdayMonth")}
              onValueChange={(v) => form.setValue("birthdayMonth", v, { shouldDirty: true })}
            >
              <SelectTrigger className="w-full" aria-label="Mês do aniversário">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOT_INFORMED}>Mês</SelectItem>
                {MONTHS.map((month, index) => (
                  <SelectItem key={month} value={String(index + 1)}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Vira lembrete de aniversariantes do mês.
          </p>
        </div>

        <Field label="Instagram" htmlFor="cliente-instagram">
          <Input
            id="cliente-instagram"
            placeholder="@usuaria"
            {...form.register("instagram")}
          />
        </Field>

        <div className="space-y-1.5">
          <Label htmlFor="cliente-tamanho">Tamanho mais comprado</Label>
          <Select
            value={form.watch("preferredSize")}
            onValueChange={(v) =>
              form.setValue("preferredSize", v as ProductSize, { shouldDirty: true })
            }
          >
            <SelectTrigger id="cliente-tamanho" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Evita separar peça errada quando ela pede pelo WhatsApp.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cliente-vendedora">Vendedora responsável</Label>
          <Select
            value={form.watch("sellerId")}
            onValueChange={(v) => form.setValue("sellerId", v, { shouldDirty: true })}
          >
            <SelectTrigger id="cliente-vendedora" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SELLER}>Sem vendedora fixa</SelectItem>
              {state.sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>
                  {seller.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cliente-origem">Como conheceu a loja</Label>
          <Select
            value={form.watch("origin")}
            onValueChange={(v) =>
              form.setValue("origin", v as Customer["origin"], { shouldDirty: true })
            }
          >
            <SelectTrigger id="cliente-origem" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORIGIN_LABELS) as Customer["origin"][]).map((key) => (
                <SelectItem key={key} value={key}>
                  {ORIGIN_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Preferências
          <span className="ml-1 font-normal text-muted-foreground">
            (marque quantas quiser)
          </span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {preferenceOptions.map((option) => {
            const selected = preferences.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => togglePreference(option)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "bg-card hover:bg-secondary"
                )}
              >
                {selected ? <Check className="size-3.5" /> : null}
                {option}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          As preferências alimentam as sugestões de mensagem e as campanhas.
        </p>
      </fieldset>

      <Field label="Observações" htmlFor="cliente-observacoes">
        <Textarea
          id="cliente-observacoes"
          placeholder="Ex.: prefere provar na loja aos sábados; não gosta de estampa grande."
          {...form.register("notes")}
        />
      </Field>

      <div className="rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <input
            id="cliente-consentimento"
            type="checkbox"
            checked={consent}
            onChange={(event) =>
              form.setValue("marketingConsent", event.target.checked, {
                shouldDirty: true,
              })
            }
            className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
          />
          <div>
            <Label htmlFor="cliente-consentimento" className="cursor-pointer">
              A cliente autoriza receber mensagens da loja
            </Label>
            {showConsentExplanation ? (
              <p className="mt-1 text-xs text-muted-foreground">
                A LGPD exige consentimento para comunicação de marketing. Sem esta
                autorização, a cliente fica de fora das campanhas — o contato
                direto de atendimento continua permitido.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <Check /> {submitLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
