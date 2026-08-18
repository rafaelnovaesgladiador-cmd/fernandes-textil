"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  EllipsisVertical,
  Package,
  Pencil,
  Image as ImageIcon,
  Percent,
  Power,
  PowerOff,
  Printer,
  Shirt,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { useConfirm } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/hooks/use-store";
import { addDays, DEMO_TODAY_START } from "@/lib/dates";
import { formatBRL, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { filterSales, productPerformance, stockAnalysis } from "@/lib/metrics";
import { createProduct, remainingCredits, updateProduct } from "@/lib/store";
import type { AppState } from "@/lib/store";
import type { Product } from "@/lib/types";
import { ProductPhotoTab } from "@/components/estudio/product-photo-tab";
import { LabelPrintDialog } from "@/components/produtos/label-print-dialog";
import { ProductEditSheet } from "@/components/produtos/product-edit-sheet";
import { ProductHistoryTab } from "@/components/produtos/product-history-tab";
import { ProductPerformanceTab } from "@/components/produtos/product-performance-tab";
import { ProductVariantsTab } from "@/components/produtos/product-variants-tab";
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
  sellingPrice,
} from "@/components/produtos/product-common";

export default function ProdutoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const state = useStore();
  const product = state.products.find((item) => item.id === params.id);

  if (!product) {
    return (
      <div className="space-y-6">
        <PageHeader title="Produto não encontrado" />
        <EmptyState
          icon={Shirt}
          title="Este produto não existe mais"
          description="Ele pode ter sido removido ou o endereço está incorreto."
          action={
            <Button size="sm" onClick={() => router.push("/produtos")}>
              <ArrowLeft /> Voltar para produtos
            </Button>
          }
        />
      </div>
    );
  }

  return <ProductDetail product={product} state={state} />;
}

function ProductDetail({
  product,
  state,
}: {
  product: Product;
  state: AppState;
}) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<StockAdjustTarget | null>(
    null
  );

  const variants = useMemo(
    () => state.variants.filter((variant) => variant.productId === product.id),
    [state.variants, product.id]
  );

  const movements = useMemo(
    () =>
      state.stockMovements.filter(
        (movement) => movement.productId === product.id
      ),
    [state.stockMovements, product.id]
  );

  const { analysis, revenue90, profit90 } = useMemo(() => {
    const range = {
      from: addDays(DEMO_TODAY_START, -89),
      to: addDays(DEMO_TODAY_START, 1),
    };
    const perf = productPerformance(state, filterSales(state, range)).find(
      (entry) => entry.productId === product.id
    );
    return {
      analysis: stockAnalysis(state).find(
        (row) => row.product.id === product.id
      ),
      revenue90: perf?.revenue ?? 0,
      profit90: perf?.profit ?? 0,
    };
  }, [state, product.id]);

  const stock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  const stockCost = stock * product.cost;
  const margin = marginPercent(product.cost, sellingPrice(product));
  const supplier = state.suppliers.find((item) => item.id === product.supplierId);
  const isActive = product.status === "ativo";

  const duplicate = () => {
    const newId = createProduct(duplicateProductInput(product, variants));
    toast.success("Produto duplicado", {
      description: `"${product.name} (cópia)" foi criado sem estoque.`,
    });
    router.push(`/produtos/${newId}`);
  };

  const toggleStatus = () => {
    if (isActive) {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.sku} · ${product.brand} · ${product.material}`}
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Voltar para a lista de produtos"
              onClick={() => router.push("/produtos")}
            >
              <ArrowLeft />
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil /> Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Mais ações do produto"
                >
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem onSelect={() => setPrinting(true)}>
                  <Printer /> Imprimir etiqueta
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() =>
                    setAdjustTarget({ product, variants })
                  }
                >
                  <Package /> Ajustar estoque
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={duplicate}>
                  <Copy /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={toggleStatus}
                  variant={isActive ? "destructive" : "default"}
                >
                  {isActive ? <PowerOff /> : <Power />}
                  {isActive ? "Inativar" : "Ativar"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ProductStatusBadge status={product.status} />
        <Badge variant="secondary">{product.category}</Badge>
        <Badge variant="outline">{product.collection}</Badge>
        {supplier ? (
          <Badge variant="outline">Fornecedor: {supplier.name}</Badge>
        ) : null}
        <span className="text-sm text-muted-foreground">
          Cadastrado em {formatDate(product.entryDate)} · {product.stockLocation}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Preço de venda</p>
          <PriceLabel product={product} className="text-lg" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Custo</p>
          <p className="text-lg font-medium tabular-nums">
            {formatBRL(product.cost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro por peça</p>
          <p className="text-lg font-medium tabular-nums">
            {formatBRL(sellingPrice(product) - product.cost)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margem</p>
          <MarginText margin={margin} className="text-lg" />
        </div>
        {product.description ? (
          <p className="w-full text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
      </div>

      <section
        aria-label="Indicadores do produto"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Estoque total"
          value={formatNumber(stock)}
          icon={Package}
          hint={`${variants.length} ${
            variants.length === 1 ? "variação" : "variações"
          } · mínimo de ${product.minStock} por variação.`}
        />
        <StatCard
          label="Valor em estoque"
          value={formatBRL(stockCost)}
          icon={Wallet}
          hint="Peças disponíveis avaliadas pelo preço de custo."
        />
        <StatCard
          label="Margem"
          value={formatPercent(margin, 1)}
          icon={Percent}
          hint="Sobre o preço praticado (promocional quando houver)."
        />
        <StatCard
          label="Sem vender há"
          value={`${formatNumber(analysis?.daysSinceLastSale ?? 0)} dias`}
          icon={CalendarClock}
          hint="Produtos sem venda há mais de 90 dias imobilizam capital."
        />
      </section>

      <Tabs defaultValue="variacoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="variacoes">Variações</TabsTrigger>
          <TabsTrigger value="foto">
            <ImageIcon />
            Foto
          </TabsTrigger>
          <TabsTrigger value="desempenho">Desempenho</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="variacoes">
          <ProductVariantsTab
            variants={variants}
            onAdjust={(variantId) =>
              setAdjustTarget({ product, variants, variantId })
            }
          />
        </TabsContent>

        <TabsContent value="foto">
          <ProductPhotoTab
            product={product}
            remaining={remainingCredits(state)}
          />
        </TabsContent>

        <TabsContent value="desempenho">
          {analysis ? (
            <ProductPerformanceTab
              analysis={analysis}
              revenue90={revenue90}
              profit90={profit90}
            />
          ) : (
            <EmptyState
              icon={Shirt}
              title="Sem dados de desempenho"
              description="Este produto ainda não entrou nas análises de giro."
            />
          )}
        </TabsContent>

        <TabsContent value="historico">
          <ProductHistoryTab movements={movements} variants={variants} />
        </TabsContent>
      </Tabs>

      <ProductEditSheet
        product={product}
        open={editing}
        onOpenChange={setEditing}
      />
      <LabelPrintDialog
        open={printing}
        onOpenChange={setPrinting}
        product={product}
        variants={variants}
        storeName={state.company.tradeName}
      />
      <StockAdjustDialog
        target={adjustTarget}
        onClose={() => setAdjustTarget(null)}
      />
      {dialog}
    </div>
  );
}
