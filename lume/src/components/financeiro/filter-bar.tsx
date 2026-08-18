"use client";

import * as React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Barra de filtros das listas do financeiro.
 *
 * No desktop os seletores ficam à vista; no celular vão para uma gaveta,
 * porque a tela do balcão não comporta três selects lado a lado.
 */
export interface FilterSelect {
  id: string;
  label: string;
  value: string;
  /** Valor considerado "sem filtro" — usado para contar filtros ativos. */
  neutralValue: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function SelectField({ filter, className }: { filter: FilterSelect; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={filter.id} className="mb-1.5 text-xs text-muted-foreground">
        {filter.label}
      </Label>
      <Select value={filter.value} onValueChange={filter.onChange}>
        <SelectTrigger id={filter.id} size="sm" className="w-full">
          <SelectValue placeholder={filter.label} />
        </SelectTrigger>
        <SelectContent>
          {filter.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterBar({
  filters,
  onReset,
  children,
}: {
  filters: FilterSelect[];
  onReset?: () => void;
  /** Ações à direita (ex.: botão "Nova despesa"). */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const activeCount = filters.filter((f) => f.value !== f.neutralValue).length;

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="hidden flex-wrap items-end gap-3 md:flex">
        {filters.map((filter) => (
          <SelectField key={filter.id} filter={filter} className="w-44" />
        ))}
        {onReset && activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Limpar filtros
          </Button>
        ) : null}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir filtros"
      >
        <SlidersHorizontal /> Filtros
        {activeCount > 0 ? (
          <Badge variant="default" className="ml-1">
            {activeCount}
          </Badge>
        ) : null}
      </Button>

      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {children}
        </div>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto pb-5">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>Ajuste o que você quer ver na lista.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            {filters.map((filter) => (
              <SelectField key={filter.id} filter={filter} />
            ))}
          </div>
          <div className="flex gap-2 p-4 pt-0">
            {onReset ? (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
            ) : null}
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
