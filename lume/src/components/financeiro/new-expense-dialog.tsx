"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form-field";
import { createExpense } from "@/lib/store";
import { formatBRL } from "@/lib/format";
import { EXPENSE_LABELS, type ExpenseCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isValidAmount, parseAmount } from "./finance-helpers";

const CATEGORIES = Object.keys(EXPENSE_LABELS) as [
  ExpenseCategory,
  ...ExpenseCategory[],
];

const expenseSchema = z.object({
  category: z.enum(CATEGORIES),
  description: z.string().min(3, "Descreva a despesa em poucas palavras"),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine(isValidAmount, "Informe um valor maior que zero"),
  kind: z.enum(["fixa", "variavel"]),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

/** Lançamento manual de despesa — o que sai do caixa sem passar por uma conta. */
export function NewExpenseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "outros",
      description: "",
      amount: "",
      kind: "variavel",
    },
  });

  const errors = form.formState.errors;
  const category = useWatch({ control: form.control, name: "category" });
  const kind = useWatch({ control: form.control, name: "kind" });

  const submit = form.handleSubmit((values) => {
    const amount = parseAmount(values.amount);
    createExpense({
      category: values.category,
      description: values.description.trim(),
      amount,
      isFixed: values.kind === "fixa",
    });
    toast.success("Despesa registrada", {
      description: `${EXPENSE_LABELS[values.category]} · ${formatBRL(amount)} — já entra no lucro do mês.`,
    });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
          <DialogDescription>
            Tudo que sai do caixa da loja. A despesa entra no mês de hoje e reduz o
            lucro do período.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Categoria" htmlFor="expense-category" required>
            <Select
              value={category}
              onValueChange={(value) =>
                form.setValue("category", value as ExpenseCategory, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="expense-category" className="w-full">
                <SelectValue placeholder="Escolha a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {EXPENSE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Descrição"
            htmlFor="expense-description"
            required
            error={errors.description?.message}
          >
            <Input
              id="expense-description"
              placeholder="Ex.: Conta de energia de julho"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
          </Field>

          <Field
            label="Valor"
            htmlFor="expense-amount"
            required
            error={errors.amount?.message}
            hint="Use vírgula para os centavos: 1.250,90"
          >
            <Input
              id="expense-amount"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={!!errors.amount}
              {...form.register("amount")}
            />
          </Field>

          <Field
            label="Tipo de despesa"
            required
            hint="Fixa: repete todo mês (aluguel, salários). Variável: muda conforme o movimento."
          >
            <div
              role="radiogroup"
              aria-label="Tipo de despesa"
              className="grid grid-cols-2 gap-2"
            >
              {(
                [
                  { value: "fixa", label: "Fixa" },
                  { value: "variavel", label: "Variável" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={kind === option.value}
                  onClick={() =>
                    form.setValue("kind", option.value, { shouldValidate: true })
                  }
                  className={cn(
                    "h-9 rounded-md border text-sm font-medium transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring/50",
                    kind === option.value
                      ? "border-primary bg-accent text-accent-foreground"
                      : "border-input bg-card hover:bg-secondary"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Registrar despesa</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
