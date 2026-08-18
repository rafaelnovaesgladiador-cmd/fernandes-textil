"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CircleDollarSign,
  LayoutGrid,
  List,
  PackageX,
  Plus,
  Shirt,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { DataTable, type Column } from "@/components/data-table";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/hooks/use-store";
import { formatBRL, formatNumber } from "@/lib/format";
import {
  daysSinceLastSaleByProduct,
  stockByProduct,
  stockSummary,
  variantsByProduct,
} from "@/lib/metrics";
import { createProduct, updateProduct } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRODUCT_FILTERS,
  ProductFilters,
  type ProductFilterValues,
} from "@/components/produtos/product-filters";
import { ProductActionsMenu } from "@/components/produtos/product-actions-menu";
import { ProductCards } from "@/components/produtos/product-cards";
import { ProductEditSheet } from "@/components/produtos/product-edit-sheet";
import {
  StockAdjustDialog,
  type StockAdjustTarget,
} from "@/components/produtos/stock-adjust-dialog";
import {
  MarginText,
  PriceLabel,
  ProductStatusBadge,
  duplicateProductInput,
  marginPercent,
  parseStockFilter,
  sellingPrice,
  type ProductRow,
  type StockFilter,
} from "@/components/produtos/product-common";
import type { Product } from "@/lib/types";

export default function ProdutosPage() {
  // useSearchParams exige uma fronteira de Suspense acima do componente.
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ProductsRoute />
    </Suspense>
  );
}

/**
 * Os alertas de estoque linkam para `/produtos?filtro=…`. A chave remonta a
 * lista quando o parâmetro muda, aplicando o filtro sem sincronizar estado.
 */
function ProductsRoute() {
  const filtro = parseStockFilter(useSearchParams().get("filtro"));
  return <ProductsList key={filtro} initialStockFilter={filtro} />;
}

function matchesStockFilter(row: ProductRow, filter: StockFilter): boolean {
  switch (filter) {
    case "sem_estoque":
      return row.stock === 0;
    case "abaixo_minimo":
      // Só produtos que ainda têm peças: os zerados aparecem em "sem estoque".
      return (
        row.stock > 0 &&
        (row.stock <= row.product.minStock ||
          row.variants.some((variant) => variant.stock < variant.minStock))
      );
    case "parados":
      return row.daysSinceLastSale > 90 && row.stock > 0;
    default:
      return true;
  }
}

function ProductsList({
  initialStockFilter,
}: {
  initialStockFilter: StockFilter;
}) {
  const router = useRouter();
  const state = useStore();
  const { confirm, dialog } = useConfirm();

  const [query, setQuery] = useState("");
  const [view, setView] = useState<"tabela" | "cards">("tabela");
  const [filters, setFilters] = useState<ProductFilterValues>({
    ...DEFAULT_PRODUCT_FILTERS,
    stock: initialStockFilter,
  });
  const [adjustTarget, setAdjustTarget] = useState<StockAdjustTarget | null>(
    null
  );
  const [editing, setEditing] = useState<Product | null>(null);

  const { rows, categories, collections, summary } = useMemo(() => {
    const variants = variantsByProduct(state);
    const stock = stockByProduct(state);
    const daysSince = daysSinceLastSaleByProduct(state);

    const built: ProductRow[] = state.products.map((product) => ({
      product,
      variants: variants.get(product.id) ?? [],
      stock: stock.get(product.id) ?? 0,
      margin: marginPercent(product.cost, sellingPrice(product)),
      daysSinceLastSale: daysSince.get(product.id) ?? 0,
    }));

    return {
      rows: built,
      categories: [...new Set(state.products.map((p) => p.category))].sort(
        (a, b) => a.localeCompare(b)
      ),
      collections: [...new Set(state.products.map((p) => p.collection))].sort(
        (a, b) => a.localeCompare(b)
      ),
      summary: stockSummary(state),
    };
  }, [state]);

  const activeProducts = useMemo(
    () => state.products.filter((p) => p.status === "ativo").length,
    [state.products]
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      const { product } = row;
      if (term) {
        const hit =
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          product.barcode.includes(term) ||
          row.variants.some(
            (variant) =>
              variant.sku.toLowerCase().includes(term) ||
              variant.barcode.includes(term)
          );
        if (!hit) return false;
      }
      if (filters.category !== "todas" && product.category !== filters.category)
        return false;
      if (
        filters.collection !== "todas" &&
        product.collection !== filters.collection
      )
        return false;
      if (filters.status !== "todos" && product.status !== filters.status)
        return false;
      return matchesStockFilter(row, filters.stock);
    });
  }, [rows, query, filters]);

  const clearFilters = () => {
    setFilters(DEFAULT_PRODUCT_FILTERS);
    setQuery("");
  };

  const isFiltered =
    query.trim().length > 0 ||
    filters.category !== "todas" ||
    filters.collection !== "todas" ||
    filters.status !== "todos" ||
    filters.stock !== "todos";

  const openProduct = (row: ProductRow) =>
    router.push(`/produtos/${row.product.id}`);

  const duplicate = (row: ProductRow) => {
    const newId = createProduct(duplicateProductInput(row.product, row.variants));
    toast.success("Produto duplicado", {
      description: `"${row.product.name} (cópia)" foi criado sem estoque.`,
      action: {
        label: "Abrir",
        onClick: () => router.push(`/produtos/${newId}`),
      },
    });
  };

  const toggleStatus = (row: ProductRow) => {
    const { product } = row;
    if (product.status === "ativo") {
      confirm({
        title: "Inativar produto",
        description: `"${product.name}" deixa de aparecer para venda e no catálogo. O estoque permanece registrado.`,
        confirmLabel: "Inativar",
        destructive: true,
        onConfirm: () => {
          updateProduct(product.id, { status: "inativo" });
          toast.success("Produto inativado", { description: product.name });
        },
      });
      return;
    }
    updateProduct(product.id, { status: "ativo" });
    toast.success("Produto ativado", { description: product.name });
  };

  const rowActions = (row: ProductRow) => (
    <ProductActionsMenu
      product={row.product}
      onView={() => openProduct(row)}
      onEdit={() => setEditing(row.product)}
      onDuplicate={() => duplicate(row)}
      onToggleStatus={() => toggleStatus(row)}
      onAdjustStock={() =>
        setAdjustTarget({ product: row.product, variants: row.variants })
      }
    />
  );

  const columns: Column<ProductRow>[] = [
    {
      id: "produto",
      header: "Produto",
      primary: true,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.product.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.product.category} · {row.product.collection}
          </p>
        </div>
      ),
    },
    {
      id: "sku",
      header: "SKU",
      secondary: true,
      cell: (row) => (
        <span className="font-mono text-xs">{row.product.sku}</span>
      ),
    },
    {
      id: "custo",
      header: "Custo",
      align: "right",
      hideOnMobile: true,
      cell: (row) => formatBRL(row.product.cost),
    },
    {
      id: "preco",
      header: "Preço",
      align: "right",
      cell: (row) => <PriceLabel product={row.product} />,
    },
    {
      id: "margem",
      header: "Margem",
      align: "right",
      cell: (row) => <MarginText margin={row.margin} />,
    },
    {
      id: "estoque",
      header: "Estoque",
      align: "right",
      cell: (row) => (
        <span
          className={cn(
            "tabular-nums",
            row.stock === 0
              ? "font-medium text-critical"
              : row.stock <= row.product.minStock
                ? "font-medium text-[#8a6100] dark:text-warning"
                : undefined
          )}
        >
          {formatNumber(row.stock)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <ProductStatusBadge status={row.product.status} />,
    },
  ];

  const emptyState = isFiltered ? (
    <EmptyState
      icon={Shirt}
      title="Nenhum produto encontrado"
      description="Nenhum produto atende à busca e aos filtros selecionados."
      action={
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Shirt}
      title="Nenhum produto cadastrado"
      description="Cadastre a primeira peça para começar a controlar estoque e margem."
      action={
        <Button size="sm" onClick={() => router.push("/produtos/novo")}>
          <Plus /> Novo produto
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description={`${formatNumber(state.products.length)} produtos · ${formatNumber(
          state.variants.length
        )} variações de cor e tamanho`}
        actions={
          <Button onClick={() => router.push("/produtos/novo")}>
            <Plus /> Novo produto
          </Button>
        }
      />

      <section
        aria-label="Indicadores do catálogo"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Produtos ativos"
          value={formatNumber(activeProducts)}
          icon={Shirt}
          hint="Produtos disponíveis para venda no PDV e no catálogo."
        />
        <StatCard
          label="Custo do estoque"
          value={formatBRL(summary.stockCost)}
          icon={Wallet}
          hint="Dinheiro investido nas peças que estão na loja."
        />
        <StatCard
          label="Potencial de venda"
          value={formatBRL(summary.stockPotential)}
          icon={CircleDollarSign}
          hint="Quanto o estoque atual renderia a preço de etiqueta."
        />
        <StatCard
          label="Sem estoque"
          value={formatNumber(summary.outOfStockProducts)}
          icon={PackageX}
          hint="Produtos ativos com todas as variações zeradas."
        />
      </section>

      <section aria-label="Busca e filtros" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome, SKU ou código de barras…"
            aria-label="Buscar produtos"
            className="sm:max-w-sm sm:flex-1"
          />
          <div className="flex items-center gap-2">
            <ProductFilters
              values={filters}
              onChange={setFilters}
              categories={categories}
              collections={collections}
              onClear={clearFilters}
            />
            <div className="ml-auto flex rounded-md border p-0.5">
              <ViewToggle
                active={view === "tabela"}
                label="Ver em tabela"
                onClick={() => setView("tabela")}
              >
                <List className="size-4" />
              </ViewToggle>
              <ViewToggle
                active={view === "cards"}
                label="Ver em cards"
                onClick={() => setView("cards")}
              >
                <LayoutGrid className="size-4" />
              </ViewToggle>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {formatNumber(visible.length)}{" "}
          {visible.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </section>

      {visible.length === 0 ? (
        emptyState
      ) : view === "cards" ? (
        <ProductCards rows={visible} onOpen={openProduct} actions={rowActions} />
      ) : (
        <DataTable
          rows={visible}
          columns={columns}
          getRowId={(row) => row.product.id}
          onRowClick={openProduct}
          actions={rowActions}
        />
      )}

      <StockAdjustDialog
        target={adjustTarget}
        onClose={() => setAdjustTarget(null)}
      />
      <ProductEditSheet
        product={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      {dialog}
    </div>
  );
}

function ViewToggle({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-8 items-center justify-center rounded-sm transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando produtos">
      <Skeleton className="h-16" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-27" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
