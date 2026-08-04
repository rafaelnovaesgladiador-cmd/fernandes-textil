"use client";

import { useMemo, useState } from "react";
import { UserRound, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/types";
import { cn } from "@/lib/utils";

const digits = (value: string) => value.replace(/\D/g, "");

/** Busca opcional de cliente por nome ou telefone. */
export function CustomerPicker({
  inputId,
  customers,
  selectedId,
  onSelect,
  error,
  required = false,
}: {
  /** Id do campo de busca — o carrinho é renderizado duas vezes na tela. */
  inputId: string;
  customers: Customer[];
  selectedId?: string;
  onSelect: (customerId: string | undefined) => void;
  error?: string;
  /** Crediário exige cliente: some o atalho "venda sem cliente". */
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [skipped, setSkipped] = useState(false);

  const selected = customers.find((c) => c.id === selectedId);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];
    const numeric = digits(term);
    return customers
      .filter(
        (customer) =>
          customer.name.toLowerCase().includes(term) ||
          (numeric.length >= 3 &&
            (digits(customer.phone).includes(numeric) ||
              digits(customer.whatsapp).includes(numeric)))
      )
      .slice(0, 5);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <UserRound className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {selected.phone} · {selected.city}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 lg:size-9"
            aria-label={`Remover ${selected.name} da venda`}
            onClick={() => {
              onSelect(undefined);
              setQuery("");
              setSkipped(false);
            }}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }

  if (skipped && !required) {
    return (
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <UserX className="size-4" />
          </div>
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Venda sem cliente identificado
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 shrink-0 lg:h-8"
            onClick={() => setSkipped(false)}
          >
            Escolher cliente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId}>
        Cliente
        {required ? (
          <span className="font-normal text-critical">obrigatório no crediário</span>
        ) : (
          <span className="font-normal text-muted-foreground">(opcional)</span>
        )}
      </Label>
      <Input
        id={inputId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nome ou telefone da cliente…"
        aria-invalid={error ? true : undefined}
        className="h-11 lg:h-9"
      />

      {results.length > 0 ? (
        <ul className="grid gap-1.5" aria-label="Clientes encontrados">
          {results.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(customer.id);
                  setQuery("");
                }}
                className="flex w-full min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors outline-none cursor-pointer hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{customer.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.phone}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim().length >= 2 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma cliente com “{query.trim()}”. Confira o nome ou siga sem
          cliente.
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : !required ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("h-11 w-full lg:h-8")}
          onClick={() => {
            onSelect(undefined);
            setQuery("");
            setSkipped(true);
          }}
        >
          <UserX />
          Venda sem cliente
        </Button>
      ) : null}
    </div>
  );
}
