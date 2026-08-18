"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Link2,
  Package,
  Search,
  Shirt,
  Sparkles,
  Star,
  TicketPercent,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/form-field";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ALL_OPTION,
  buildCatalogItems,
  catalogFacets,
  catalogValue,
  type CatalogItem,
} from "@/components/catalogo/catalog-data";
import { ProductMedia, productImage } from "@/components/catalogo/product-media";
import { copyToClipboard, formatPhone } from "@/components/catalogo/share";
import { Storefront } from "@/components/catalogo/storefront";
import { PhoneFrame } from "@/components/catalogo/storefront-frame";
import { StudioTab } from "@/components/estudio/studio-tab";
import { useStore } from "@/hooks/use-store";
import { useMounted } from "@/lib/client-store";
import { formatBRL, formatNumber } from "@/lib/format";
import { updateSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

type TabKey = "configuracao" | "produtos" | "previa" | "estudio";

const TAB_KEYS: TabKey[] = ["configuracao", "produtos", "previa", "estudio"];

/**
 * Administração do catálogo virtual.
 *
 * Quatro frentes: como a vitrine se apresenta, o que entra nela, como ela fica
 * de verdade no celular da cliente — a prévia usa o mesmo componente da página
 * pública, sem maquete paralela para desatualizar — e o estúdio, que produz as
 * imagens das peças.
 *
 * A aba vive na URL para que o produto consiga abrir o provador já apontando
 * para a peça certa.
 */
export default function CatalogoPage() {
  return (
    <React.Suspense fallback={<CatalogoSkeleton />}>
      <CatalogoContent />
    </React.Suspense>
  );
}

function CatalogoSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando catálogo">
      <Skeleton className="h-14 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-9 w-96" />
      <Skeleton className="h-124" />
    </div>
  );
}

function CatalogoContent() {
  const state = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  const catalog = state.settings.catalog;

  const items = React.useMemo(() => buildCatalogItems(state), [state]);
  const featuredCount = items.filter((item) => item.isFeatured).length;
  const promoCount = items.filter((item) => item.hasPromo).length;
  const activeProducts = state.products.filter((p) => p.status === "ativo").length;
  const hiddenProducts = Math.max(0, activeProducts - items.length);

  const catalogHref = "/vitrine";
  const catalogUrl = mounted ? `${window.location.origin}${catalogHref}` : catalogHref;

  const abaParam = searchParams.get("aba");
  const produtoParam = searchParams.get("produto");
  const tab: TabKey = TAB_KEYS.includes(abaParam as TabKey)
    ? (abaParam as TabKey)
    : "configuracao";

  // A aba escolhida à mão reescreve a URL: o botão "voltar" do celular
  // continua desfazendo a navegação, e o link do produto sai do endereço.
  const changeTab = (value: string) => {
    router.replace(
      value === "configuracao" ? "/catalogo" : `/catalogo?aba=${value}`
    );
  };

  const copyLink = async () => {
    const ok = await copyToClipboard(catalogUrl);
    if (ok) toast.success("Link copiado", { description: catalogUrl });
    else toast.error("Não foi possível copiar o link");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo virtual"
        description="Sua vitrine compartilhável: a cliente escolhe as peças e o pedido chega pronto no WhatsApp."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy /> Copiar link
            </Button>
            <Button size="sm" asChild>
              <a href={catalogHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Abrir vitrine
              </a>
            </Button>
          </>
        }
      />

      <section
        aria-label="Indicadores do catálogo"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatCard
          label="Produtos publicados"
          value={formatNumber(items.length)}
          icon={Shirt}
          hint="Produtos ativos com pelo menos uma peça em estoque. O resto fica oculto automaticamente."
        />
        <StatCard
          label="Em destaque"
          value={formatNumber(featuredCount)}
          icon={Star}
          hint="Aparecem no topo da vitrine, antes das demais peças."
        />
        <StatCard
          label="Em promoção"
          value={formatNumber(promoCount)}
          icon={TicketPercent}
          hint="Produtos com preço promocional cadastrado."
        />
        <StatCard
          label="Valor da vitrine"
          value={formatBRL(catalogValue(items))}
          icon={Wallet}
          hint="Soma do estoque publicado a preço de etiqueta."
        />
      </section>

      <Tabs value={tab} onValueChange={changeTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuracao">Configuração</TabsTrigger>
          <TabsTrigger value="produtos">Produtos no catálogo</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
          <TabsTrigger value="estudio">
            <Sparkles />
            Estúdio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuracao">
          {/* O formulário guarda os valores em estado local: só monta depois da
              hidratação, quando o estado salvo no navegador já chegou. */}
          {mounted ? (
            <ConfigTab catalogUrl={catalogUrl} onCopyLink={copyLink} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <Skeleton className="h-124 lg:col-span-2" />
              <Skeleton className="h-64" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="produtos">
          <ProductsTab items={items} hiddenProducts={hiddenProducts} />
        </TabsContent>

        <TabsContent value="previa">
          <PreviewTab
            headline={catalog.headline}
            published={items.length}
            featured={featuredCount}
          />
        </TabsContent>

        <TabsContent value="estudio">
          {/* O estúdio lê créditos, modelo e histórico do estado salvo no
              navegador: só monta depois da hidratação. */}
          {mounted ? (
            <StudioTab initialProductId={produtoParam ?? undefined} />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-80" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

function ConfigTab({
  catalogUrl,
  onCopyLink,
}: {
  catalogUrl: string;
  onCopyLink: () => void;
}) {
  const state = useStore();
  const catalog = state.settings.catalog;

  const [headline, setHeadline] = React.useState(catalog.headline);
  const [description, setDescription] = React.useState(catalog.description);
  const [whatsapp, setWhatsapp] = React.useState(catalog.whatsapp);
  const [showPrices, setShowPrices] = React.useState(catalog.showPrices);
  const [touched, setTouched] = React.useState(false);

  const dirty =
    headline !== catalog.headline ||
    description !== catalog.description ||
    whatsapp !== catalog.whatsapp ||
    showPrices !== catalog.showPrices;

  const digits = whatsapp.replace(/\D/g, "");
  const headlineError =
    touched && headline.trim().length < 3
      ? "Escreva um título com pelo menos 3 caracteres."
      : undefined;
  const whatsappError =
    touched && digits.length > 0 && digits.length < 10
      ? "Informe DDD e número, ex.: 19 98765-4321."
      : undefined;

  const reset = () => {
    setHeadline(catalog.headline);
    setDescription(catalog.description);
    setWhatsapp(catalog.whatsapp);
    setShowPrices(catalog.showPrices);
    setTouched(false);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (headline.trim().length < 3) {
      toast.error("Revise o título de destaque antes de salvar.");
      return;
    }
    if (digits.length > 0 && digits.length < 10) {
      toast.error("Revise o WhatsApp antes de salvar.");
      return;
    }
    // Lê o estado no momento de salvar: os destaques marcados na outra aba
    // não podem ser sobrescritos por uma cópia antiga.
    updateSettings({
      catalog: {
        ...state.settings.catalog,
        headline: headline.trim(),
        description: description.trim(),
        whatsapp: digits,
        showPrices,
      },
    });
    setTouched(false);
    toast.success("Catálogo atualizado", {
      description: "A vitrine já está mostrando as novas informações.",
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Identidade da vitrine</CardTitle>
          <CardDescription>
            É o primeiro contato da cliente com a loja quando ela abre o link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={save}>
            <Field
              label="Título de destaque"
              htmlFor="catalogo-headline"
              required
              error={headlineError}
              hint="Aparece em letras grandes logo abaixo do nome da loja."
            >
              <Input
                id="catalogo-headline"
                value={headline}
                maxLength={80}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Novidades da coleção"
              />
            </Field>

            <Field
              label="Descrição"
              htmlFor="catalogo-descricao"
              hint="Uma ou duas frases sobre a coleção, o atendimento ou as formas de pagamento."
            >
              <Textarea
                id="catalogo-descricao"
                value={description}
                maxLength={240}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Peças selecionadas com carinho para você…"
              />
            </Field>

            <Field
              label="WhatsApp para pedidos"
              htmlFor="catalogo-whatsapp"
              required
              error={whatsappError}
              hint={
                digits.length >= 10
                  ? `Os pedidos serão enviados para ${formatPhone(digits)}.`
                  : "Com DDD. O DDI 55 é adicionado automaticamente."
              }
            >
              <Input
                id="catalogo-whatsapp"
                value={whatsapp}
                inputMode="tel"
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="19 98765-4321"
              />
            </Field>

            <Separator />

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="min-w-0">
                <label
                  htmlFor="catalogo-precos"
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                >
                  {showPrices ? (
                    <Eye className="size-4 text-muted-foreground" aria-hidden />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  Mostrar preços na vitrine
                </label>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Lojas que vendem no atacado, trabalham com tabelas por volume
                  ou preferem negociar na conversa costumam ocultar os valores.
                  Com a opção desligada, a cliente vê{" "}
                  <span className="font-medium">&ldquo;Consulte o valor&rdquo;</span> e o
                  pedido chega sem preços.
                </p>
              </div>
              <Switch
                id="catalogo-precos"
                checked={showPrices}
                onCheckedChange={setShowPrices}
                aria-label="Mostrar preços na vitrine"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={!dirty}>
                <Check /> Salvar alterações
              </Button>
              {dirty ? (
                <Button type="button" variant="ghost" onClick={reset}>
                  Descartar
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Tudo salvo.
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" aria-hidden />
            Link do catálogo
          </CardTitle>
          <CardDescription>
            Compartilhe no status do WhatsApp, na bio do Instagram ou direto na
            conversa com a cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="break-all rounded-lg border bg-muted/60 px-3 py-2 font-mono text-xs">
            {catalogUrl}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onCopyLink}>
              <Copy /> Copiar link
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="/vitrine" target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Abrir
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            A vitrine é pública: quem tiver o link consegue ver as peças, sem
            login. Os preços de custo e os dados da gestão nunca aparecem lá.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Produtos no catálogo
// ---------------------------------------------------------------------------

function ProductsTab({
  items,
  hiddenProducts,
}: {
  items: CatalogItem[];
  hiddenProducts: number;
}) {
  const state = useStore();
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState(ALL_OPTION);
  const [onlyFeatured, setOnlyFeatured] = React.useState(false);

  const facets = React.useMemo(() => catalogFacets(items), [items]);

  const visible = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== ALL_OPTION && item.product.category !== category)
        return false;
      if (onlyFeatured && !item.isFeatured) return false;
      if (!term) return true;
      return (
        item.product.name.toLowerCase().includes(term) ||
        item.product.sku.toLowerCase().includes(term)
      );
    });
  }, [items, query, category, onlyFeatured]);

  const featuredCount = items.filter((item) => item.isFeatured).length;

  const toggleFeatured = (item: CatalogItem) => {
    const current = state.settings.catalog.featuredProductIds;
    const isFeatured = current.includes(item.product.id);
    updateSettings({
      catalog: {
        ...state.settings.catalog,
        featuredProductIds: isFeatured
          ? current.filter((id) => id !== item.product.id)
          : [...current, item.product.id],
      },
    });
    toast.success(
      isFeatured ? "Destaque removido" : "Produto em destaque",
      { description: item.product.name }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos no catálogo</CardTitle>
        <CardDescription>
          <span className="font-medium text-foreground">
            {formatNumber(items.length)}{" "}
            {items.length === 1 ? "produto publicado" : "produtos publicados"}
          </span>{" "}
          · {formatNumber(featuredCount)} em destaque
          {hiddenProducts > 0
            ? ` · ${formatNumber(hiddenProducts)} ${
                hiddenProducts === 1 ? "produto oculto" : "produtos ocultos"
              } por falta de estoque`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome ou SKU…"
            aria-label="Buscar produto do catálogo"
            className="sm:max-w-xs sm:flex-1"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filtrar por categoria" className="w-full sm:w-52">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION}>Todas as categorias</SelectItem>
              {facets.categories.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={onlyFeatured ? "default" : "outline"}
            size="default"
            aria-pressed={onlyFeatured}
            onClick={() => setOnlyFeatured((current) => !current)}
          >
            <Star className={cn(onlyFeatured && "fill-current")} /> Só destaques
          </Button>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum produto encontrado"
            description="Ajuste a busca ou o filtro de categoria para encontrar a peça."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCategory(ALL_OPTION);
                  setOnlyFeatured(false);
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {visible.map((item) => (
              <li
                key={item.product.id}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-secondary/40"
              >
                <ProductMedia
                  name={item.product.name}
                  color={item.colors[0]?.name}
                  image={productImage(item.product)}
                  className="size-12 shrink-0 rounded-md"
                  compact
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium">
                      {item.product.name}
                    </p>
                    {item.isFeatured ? (
                      <Badge variant="accent">Destaque</Badge>
                    ) : null}
                    {item.hasPromo ? (
                      <Badge variant="success">-{item.discountPercent}%</Badge>
                    ) : null}
                    {item.isLastPieces ? (
                      <Badge variant="warning">Últimas peças</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.product.category} · {item.product.collection} ·{" "}
                    {formatNumber(item.stock)}{" "}
                    {item.stock === 1 ? "peça" : "peças"} ·{" "}
                    {item.colors.length}{" "}
                    {item.colors.length === 1 ? "cor" : "cores"}
                  </p>
                </div>
                <p className="hidden shrink-0 text-sm font-semibold tabular-nums sm:block">
                  {formatBRL(item.price)}
                </p>
                <Button
                  variant={item.isFeatured ? "secondary" : "ghost"}
                  size="icon"
                  aria-pressed={item.isFeatured}
                  aria-label={
                    item.isFeatured
                      ? `Remover ${item.product.name} dos destaques`
                      : `Colocar ${item.product.name} em destaque`
                  }
                  onClick={() => toggleFeatured(item)}
                >
                  <Star
                    className={cn(
                      item.isFeatured
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          A vitrine mostra apenas produtos ativos com estoque. Quando a última
          peça é vendida, o produto sai do ar sozinho — e volta ao ser reposto.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Prévia
// ---------------------------------------------------------------------------

function PreviewTab({
  headline,
  published,
  featured,
}: {
  headline: string;
  published: number;
  featured: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Prévia no celular</CardTitle>
          <CardDescription>
            Exatamente a mesma tela que a cliente abre pelo link — role, filtre
            e toque nas peças para testar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneFrame>
            <Storefront />
          </PhoneFrame>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden />
              O que a cliente vê
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Título de destaque</p>
              <p className="font-medium">{headline || "—"}</p>
            </div>
            <Separator />
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Package className="mt-0.5 size-4 shrink-0" aria-hidden />
                {formatNumber(published)} peças publicadas, com cores e tamanhos
                que ainda têm estoque.
              </li>
              <li className="flex items-start gap-2">
                <Star className="mt-0.5 size-4 shrink-0" aria-hidden />
                {featured > 0
                  ? `${formatNumber(featured)} em destaque, no topo da vitrine.`
                  : "Nenhum destaque marcado — a seção some da vitrine."}
              </li>
              <li className="flex items-start gap-2">
                <Copy className="mt-0.5 size-4 shrink-0" aria-hidden />
                A lista de interesse fica salva no celular dela e vira uma
                mensagem pronta no WhatsApp.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Testar de verdade</CardTitle>
            <CardDescription>
              Abra a vitrine em outra aba e mande o link para você mesma no
              WhatsApp: é assim que a cliente vai receber.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <a href="/vitrine" target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Abrir vitrine em nova aba
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
