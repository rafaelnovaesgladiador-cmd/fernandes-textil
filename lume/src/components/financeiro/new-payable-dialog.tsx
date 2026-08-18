"use client";

import { useForm } from "react-hook-form";
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
import { Field } from "@/components/form-field";
import { createPayable } from "@/lib/store";
import { formatBRL, formatDate } from "@/lib/format";
import {
  dateInputValue,
  isValidAmount,
  isoFromDateInput,
  parseAmount,
} from "./finance-helpers";

const payableSchema = z.object({
  description: z.string().min(3, "Descreva a conta"),
  supplierName: z.string().optional(),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine(isValidAmount, "Informe um valor maior que zero"),
  dueDate: z.string().min(1, "Informe o vencimento"),
});

type PayableForm = z.infer<typeof payableSchema>;

/** Conta a pagar: um compromisso futuro — vira despesa só quando é paga. */
export function NewPayableDialog({
  open,
  onOpenChange,
  supplierNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierNames: string[];
}) {
  const form = useForm<PayableForm>({
    resolver: zodResolver(payableSchema),
    defaultValues: {
      description: "",
      supplierName: "",
      amount: "",
      dueDate: dateInputValue(7),
    },
  });

  const errors = form.formState.errors;

  const submit = form.handleSubmit((values) => {
    const amount = parseAmount(values.amount);
    const dueDate = isoFromDateInput(values.dueDate);
    createPayable({
      description: values.description.trim(),
      supplierName: values.supplierName?.trim() || undefined,
      amount,
      dueDate,
    });
    toast.success("Conta a pagar cadastrada", {
      description: `${formatBRL(amount)} com vencimento em ${formatDate(dueDate)}.`,
    });
    form.reset({
      description: "",
      supplierName: "",
      amount: "",
      dueDate: dateInputValue(7),
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conta a pagar</DialogTitle>
          <DialogDescription>
            Compromissos com data marcada — fornecedores, aluguel, impostos. Ao
            marcar como paga, o valor vira despesa e sai do caixa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field
            label="Descrição"
            htmlFor="payable-description"
            required
            error={errors.description?.message}
          >
            <Input
              id="payable-description"
              placeholder="Ex.: Duplicata 2/3 — pedido de inverno"
              aria-invalid={!!errors.description}
              {...form.register("description")}
            />
          </Field>

          <Field label="Fornecedor" htmlFor="payable-supplier">
            <Input
              id="payable-supplier"
              list="payable-supplier-options"
              placeholder="Ex.: Malharia Bela Vista"
              {...form.register("supplierName")}
            />
            <datalist id="payable-supplier-options">
              {supplierNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Valor"
              htmlFor="payable-amount"
              required
              error={errors.amount?.message}
              hint="Use vírgula para os centavos."
            >
              <Input
                id="payable-amount"
                inputMode="decimal"
                placeholder="0,00"
                aria-invalid={!!errors.amount}
                {...form.register("amount")}
              />
            </Field>

            <Field
              label="Vencimento"
              htmlFor="payable-due"
              required
              error={errors.dueDate?.message}
            >
              <Input
                id="payable-due"
                type="date"
                aria-invalid={!!errors.dueDate}
                {...form.register("dueDate")}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Cadastrar conta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
