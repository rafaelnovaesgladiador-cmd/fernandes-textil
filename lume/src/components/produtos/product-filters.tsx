"use client";

import { useState } from "react";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { STOCK_FILTER_LABELS, type StockFilter } from "./product-common";

export interface ProductFilterValues {
  category: string;
  collection: string;
  status: "todos" | "ativo" | "inativo";
  stock: StockFilter;
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilterValues = {
  category: "todas",
  collection: "todas",
  status: "todos",
  stock: "todos",
};

export function countActiveFilters(values: ProductFilterValues): number {
  return (
    Number(values.category !== "todas") +
    Number(values.collection !== "todas") +
    Number(values.status !== "todos") +
    Number(values.stock !== "todos")
  );
}

interface FiltersProps {
  values: ProductFilterValues;
  onChange: (values: ProductFilterValues) => void;
  categories: string[];
  collections: string[];
  onClear: () => void;
}

/**
 * No desktop os seletores ficam à vista; no celular vão para uma gaveta,
 * para não empurrar a lista de produtos para fora da tela.
 */
export function ProductFilters(props: FiltersProps) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(props.values);

  return (
    <>
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <FilterControls {...props} />
        {active > 0 ? (
          <Button variant="ghost" size="sm" onClick={props.onClear}>
            Limpar
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
        <SlidersHorizontal />
        Filtros
        {active > 0 ? (
          <Badge variant="default" className="ml-1">
            {active}
          </Badge>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filtrar produtos</SheetTitle>
            <SheetDescription>
              Combine categoria, coleção, status e situação de estoque.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4">
            <FilterControls {...props} stacked />
          </div>
          <div className="flex gap-2 border-t p-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                props.onClear();
                setOpen(false);
              }}
            >
              Limpar filtros
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterControls({
  values,
  onChange,
  categories,
  collections,
  stacked = false,
}: FiltersProps & { stacked?: boolean }) {
  const triggerClass = stacked ? "w-full" : "w-auto";

  const field = (id: string, label: string, control: React.ReactNode) =>
    stacked ? (
      <div className="space-y-1.5" key={id}>
        <Label htmlFor={id}>{label}</Label>
        {control}
      </div>
    ) : (
      control
    );

  return (
    <>
      {field(
        "filtro-categoria",
        "Categoria",
        <Select
          key="categoria"
          value={values.category}
          onValueChange={(category) => onChange({ ...values, category })}
        >
          <SelectTrigger
            id="filtro-categoria"
            size="sm"
            className={triggerClass}
            aria-label="Filtrar por categoria"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field(
        "filtro-colecao",
        "Coleção",
        <Select
          key="colecao"
          value={values.collection}
          onValueChange={(collection) => onChange({ ...values, collection })}
        >
          <SelectTrigger
            id="filtro-colecao"
            size="sm"
            className={triggerClass}
            aria-label="Filtrar por coleção"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as coleções</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection} value={collection}>
                {collection}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field(
        "filtro-status",
        "Status",
        <Select
          key="status"
          value={values.status}
          onValueChange={(status) =>
            onChange({ ...values, status: status as ProductFilterValues["status"] })
          }
        >
          <SelectTrigger
            id="filtro-status"
            size="sm"
            className={triggerClass}
            aria-label="Filtrar por status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Ativos e inativos</SelectItem>
            <SelectItem value="ativo">Somente ativos</SelectItem>
            <SelectItem value="inativo">Somente inativos</SelectItem>
          </SelectContent>
        </Select>
      )}

      {field(
        "filtro-estoque",
        "Situação de estoque",
        <Select
          key="estoque"
          value={values.stock}
          onValueChange={(stock) =>
            onChange({ ...values, stock: stock as StockFilter })
          }
        >
          <SelectTrigger
            id="filtro-estoque"
            size="sm"
            className={triggerClass}
            aria-label="Filtrar por situação de estoque"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              Object.keys(STOCK_FILTER_LABELS) as StockFilter[]
            ).map((key) => (
              <SelectItem key={key} value={key}>
                {STOCK_FILTER_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}
