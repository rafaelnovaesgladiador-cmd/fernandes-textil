"use client";

import * as React from "react";
import {
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Button } from "@/components/ui/button";
import { useStore } from "@/hooks/use-store";
import { useMounted } from "@/lib/client-store";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ALL_OPTION,
  buildCatalogItems,
  catalogFacets,
  filterCatalog,
  hasActiveFilters,
  type CatalogFilters,
  type CatalogItem,
} from "./catalog-data";
import { InterestList } from "./interest-list";
import { ProductCard } from "./product-card";
import { ProductDetailSheet } from "./product-detail-sheet";
import { formatPhone } from "./share";
import { useStorefrontFrame } from "./storefront-frame";

/**
 * Vitrine pública da loja.
 *
 * É o MESMO componente usado na rota /vitrine e na prévia da administração —
 * o lojista vê exatamente o que a cliente vê. Toda a responsividade usa
 * container queries em vez de breakpoints de janela: dentro da moldura de
 * celular o layout se comporta como em um celular de verdade.
 */
export function Storefront({ className }: { className?: string }) {
  const state = useStore();
  const mounted = useMounted();
  const { embedded } = useStorefrontFrame();

  const catalog = state.settings.catalog;
  const company = state.company;

  const items = React.useMemo(() => buildCatalogItems(state), [state]);
  const facets = React.useMemo(() => catalogFacets(items), [items]);

  const [filters, setFilters] = React.useState<CatalogFilters>({
    query: "",
    category: ALL_OPTION,
    collection: ALL_OPTION,
  });
  const filtering = hasActiveFilters(filters);
  const visible = React.useMemo(
    () => filterCatalog(items, filters),
    [items, filters]
  );

  const featured = React.useMemo(
    () => items.filter((item) => item.isFeatured),
    [items]
  );
  const promos = React.useMemo(
    () => items.filter((item) => item.hasPromo),
    [items]
  );

  // Detalhe: guarda o id (não o objeto) para acompanhar o estoque em tempo real.
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const detailItem = React.useMemo(
    () => items.find((item) => item.product.id === detailId) ?? null,
    [items, detailId]
  );

  const openDetail = (item: CatalogItem) => {
    setDetailId(item.product.id);
    setDetailOpen(true);
  };
  const changeDetail = (open: boolean) => {
    setDetailOpen(open);
    if (!open) window.setTimeout(() => setDetailId(null), 250);
  };

  const clearFilters = () =>
    setFilters({ query: "", category: ALL_OPTION, collection: ALL_OPTION });

  const catalogUrl =
    mounted && !embedded ? `${window.location.origin}/vitrine` : undefined;

  return (
    <div
      className={cn(
        "relative flex min-h-full flex-col bg-background text-foreground",
        className
      )}
    >
      <div className="@container flex flex-1 flex-col">
        <header className="border-b bg-linear-to-b from-accent via-accent/40 to-background">
          <div className="mx-auto w-full max-w-5xl px-5 py-8 text-center @3xl:py-14">
            <span
              aria-hidden
              className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold tracking-tight text-primary-foreground shadow-sm @3xl:size-14 @3xl:text-lg"
            >
              {company.logoInitials}
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight @3xl:text-4xl">
              {company.tradeName}
            </h1>
            <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {company.city}/{company.state}
            </p>
            {catalog.headline ? (
              <p className="mt-5 text-lg font-medium leading-snug text-accent-foreground @3xl:text-2xl">
                {catalog.headline}
              </p>
            ) : null}
            {catalog.description ? (
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground @3xl:text-base">
                {catalog.description}
              </p>
            ) : null}
          </div>
        </header>

        <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto w-full max-w-5xl space-y-2.5 px-5 py-3">
            <SearchInput
              value={filters.query}
              onChange={(query) => setFilters((current) => ({ ...current, query }))}
              placeholder="Buscar peça pelo nome…"
              aria-label="Buscar peça pelo nome"
              className="[&_input]:h-11 [&_input]:rounded-full [&_input]:text-base"
            />
            <ChipRow
              label="Filtrar por categoria"
              options={facets.categories}
              value={filters.category}
              allLabel="Todas as peças"
              onChange={(category) =>
                setFilters((current) => ({ ...current, category }))
              }
            />
            {facets.collections.length > 1 ? (
              <ChipRow
                label="Filtrar por coleção"
                options={facets.collections}
                value={filters.collection}
                allLabel="Todas as coleções"
                onChange={(collection) =>
                  setFilters((current) => ({ ...current, collection }))
                }
              />
            ) : null}
          </div>
        </div>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-5 pb-28 pt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Vitrine em preparação"
              description="As peças desta coleção estão sendo cadastradas. Volte em instantes."
            />
          ) : null}

          {!filtering && featured.length > 0 ? (
            <section aria-labelledby="vitrine-destaques">
              <SectionTitle
                id="vitrine-destaques"
                icon={Sparkles}
                title="Destaques"
                subtitle="Escolhidas a dedo pela loja"
              />
              <div className="-mx-5 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {featured.map((item) => (
                  <ProductCard
                    key={item.product.id}
                    item={item}
                    showPrices={catalog.showPrices}
                    onSelect={openDetail}
                    className="w-40 shrink-0 snap-start @2xl:w-48"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {!filtering && promos.length > 0 ? (
            <section aria-labelledby="vitrine-promocoes">
              <SectionTitle
                id="vitrine-promocoes"
                icon={TicketPercent}
                title="Promoções"
                subtitle={`${formatNumber(promos.length)} ${
                  promos.length === 1 ? "peça com desconto" : "peças com desconto"
                }`}
              />
              <ProductGrid
                items={promos.slice(0, 8)}
                showPrices={catalog.showPrices}
                onSelect={openDetail}
                className="mt-3"
              />
            </section>
          ) : null}

          {items.length > 0 ? (
            <section aria-labelledby="vitrine-todas">
              <SectionTitle
                id="vitrine-todas"
                title={filtering ? "Resultados da busca" : "Todas as peças"}
                subtitle={`${formatNumber(visible.length)} ${
                  visible.length === 1 ? "peça disponível" : "peças disponíveis"
                }`}
                action={
                  filtering ? (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  ) : null
                }
              />
              {visible.length > 0 ? (
                <ProductGrid
                  items={visible}
                  showPrices={catalog.showPrices}
                  onSelect={openDetail}
                  className="mt-3"
                />
              ) : (
                <EmptyState
                  icon={Search}
                  className="mt-3"
                  title="Nenhuma peça encontrada"
                  description="Tente outra palavra ou veja todas as peças da vitrine."
                  action={
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Ver todas as peças
                    </Button>
                  }
                />
              )}
            </section>
          ) : null}
        </main>

        <footer className="border-t bg-secondary/50">
          <div className="mx-auto w-full max-w-5xl space-y-1 px-5 py-8 text-center">
            <p className="text-sm font-semibold">{company.tradeName}</p>
            <p className="text-xs text-muted-foreground">
              {company.city}/{company.state}
              {company.instagram ? ` · ${company.instagram}` : ""}
            </p>
            {catalog.whatsapp ? (
              <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <MessageCircle className="size-3.5" aria-hidden />
                Pedidos pelo WhatsApp {formatPhone(catalog.whatsapp)}
              </p>
            ) : null}
            <p className="pt-3 text-[11px] text-muted-foreground/80">
              Preços e disponibilidade sujeitos a alteração sem aviso.
            </p>
          </div>
        </footer>
      </div>

      {detailItem ? (
        <ProductDetailSheet
          key={detailItem.product.id}
          item={detailItem}
          open={detailOpen}
          onOpenChange={changeDetail}
          showPrices={catalog.showPrices}
          storeName={company.tradeName}
          whatsapp={catalog.whatsapp}
        />
      ) : null}

      <InterestList
        showPrices={catalog.showPrices}
        storeName={company.tradeName}
        whatsapp={catalog.whatsapp}
        catalogUrl={catalogUrl}
      />
    </div>
  );
}

function ProductGrid({
  items,
  showPrices,
  onSelect,
  className,
}: {
  items: CatalogItem[];
  showPrices: boolean;
  onSelect: (item: CatalogItem) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 @2xl:grid-cols-3 @4xl:grid-cols-4 @2xl:gap-4",
        className
      )}
    >
      {items.map((item) => (
        <ProductCard
          key={item.product.id}
          item={item}
          showPrices={showPrices}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function SectionTitle({
  id,
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-1.5 text-base font-semibold tracking-tight @3xl:text-lg"
        >
          {Icon ? <Icon className="size-4 text-primary" aria-hidden /> : null}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Chips roláveis: no celular a cliente filtra deslizando o dedo. */
function ChipRow({
  label,
  options,
  value,
  allLabel,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  allLabel: string;
  onChange: (value: string) => void;
}) {
  const entries = [{ key: ALL_OPTION, label: allLabel }, ...options.map((option) => ({ key: option, label: option }))];

  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {entries.map((entry) => {
        const active = entry.key === value;
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => onChange(entry.key)}
            aria-pressed={active}
            className={cn(
              "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}
