"use client";

import { useState } from "react";
import { Target } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { updateSellerGoal } from "@/lib/store";
import { formatBRL, formatPercent } from "@/lib/format";
import type { SellerPerformance } from "@/lib/metrics";

/** Edição da meta mensal individual. */
export function SellerGoalDialog({
  open,
  onOpenChange,
  entry,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: SellerPerformance | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {entry ? (
        <DialogContent className="sm:max-w-sm">
          <GoalBody entry={entry} onDone={() => onOpenChange(false)} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function GoalBody({
  entry,
  onDone,
}: {
  entry: SellerPerformance;
  onDone: () => void;
}) {
  const [value, setValue] = useState(String(entry.seller.monthlyGoal));

  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const projected = valid ? (entry.revenue / parsed) * 100 : 0;

  const submit = () => {
    if (!valid) {
      toast.error("Informe uma meta maior que zero.");
      return;
    }
    updateSellerGoal(entry.seller.id, Math.round(parsed));
    toast.success("Meta atualizada", {
      description: `${entry.seller.name} · nova meta de ${formatBRL(Math.round(parsed))} por mês.`,
    });
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Meta de {entry.seller.name}</DialogTitle>
        <DialogDescription>
          Meta mensal de faturamento. Serve para acompanhar o ritmo, não para
          punir — combine o número com ela antes de salvar.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-1.5">
        <Label htmlFor="meta-vendedora">Meta mensal (R$)</Label>
        <Input
          id="meta-vendedora"
          inputMode="numeric"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={!valid}
        />
        <p className="text-xs text-muted-foreground">
          Meta atual: {formatBRL(entry.seller.monthlyGoal)}
          {valid
            ? ` · com o faturamento do período, ela estaria em ${formatPercent(projected)} da nova meta.`
            : ""}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={submit}>
          <Target /> Salvar meta
        </Button>
      </DialogFooter>
    </>
  );
}
