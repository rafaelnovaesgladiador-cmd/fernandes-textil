"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { generateTryOn } from "@/lib/store";
import type { Product, StoreModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./image-upload";
import {
  CreditsBlocked,
  GeneratingBox,
  GenerationError,
  StudioImage,
} from "./studio-common";

/**
 * Provador.
 *
 * Junta a modelo da loja com a foto de uma peça. Só funciona depois que a
 * modelo existe — sem ela não há identidade para vestir, e o painel explica
 * isso em vez de simplesmente desabilitar o botão.
 */

/** Busca sem acento e sem caixa: "vestido" encontra "Vestido Midi". */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Foto da peça já cadastrada no produto, quando houver. */
function storedPhoto(product: Product): string | undefined {
  return product.coverImage ?? product.sourcePhoto;
}

type GarmentSource = "cadastrada" | "enviada";

export function TryOnPanel({
  model,
  products,
  remaining,
  initialProductId,
  onGoToModel,
}: {
  model: StoreModel | null;
  /** Produtos ativos, na ordem em que aparecem na busca. */
  products: Product[];
  remaining: number;
  initialProductId?: string;
  onGoToModel: () => void;
}) {
  const router = useRouter();
  const [productId, setProductId] = React.useState<string | undefined>(
    initialProductId
  );
  const [query, setQuery] = React.useState("");
  const [source, setSource] = React.useState<GarmentSource>("cadastrada");
  const [upload, setUpload] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);

  const product = products.find((item) => item.id === productId);
  const stored = product ? storedPhoto(product) : undefined;
  const blocked = remaining <= 0;

  // A foto cadastrada só pode ser a escolhida se ela existir.
  const effectiveSource: GarmentSource =
    stored && source === "cadastrada" ? "cadastrada" : "enviada";
  const garment = effectiveSource === "cadastrada" ? stored : upload;

  const matches = React.useMemo(() => {
    const term = normalize(query);
    const list = term
      ? products.filter((item) =>
          normalize(`${item.name} ${item.sku} ${item.category}`).includes(term)
        )
      : products;
    return list.slice(0, 8);
  }, [products, query]);

  const chooseProduct = (next: Product) => {
    setProductId(next.id);
    setQuery("");
    setUpload(undefined);
    setResult(null);
    setError(null);
    setSource(storedPhoto(next) ? "cadastrada" : "enviada");
  };

  const generate = async () => {
    if (!product || !garment || blocked || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const outcome = await generateTryOn({
      productId: product.id,
      garment: effectiveSource === "enviada" ? upload : undefined,
    });
    setLoading(false);
    if (!outcome.ok || !outcome.image) {
      setError(outcome.error ?? "Não foi possível gerar a imagem.");
      return;
    }
    setResult(outcome.image);
    toast.success("Prova pronta", {
      description: `${model?.name ?? "A modelo"} vestindo ${product.name}.`,
    });
  };

  if (!model) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shirt className="size-4 text-primary" aria-hidden />
            Provador
          </CardTitle>
          <CardDescription>
            A modelo da loja veste a peça que você enviar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UserRoundPlus}
            title="Crie a modelo da loja para liberar o provador"
            description="O provador precisa de uma pessoa fixa para vestir as peças — é isso que mantém todas as fotos da vitrine com a mesma modelo."
            action={
              <Button className="h-11" onClick={onGoToModel}>
                <UserRoundPlus /> Criar a modelo
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shirt className="size-4 text-primary" aria-hidden />
          Provador
        </CardTitle>
        <CardDescription>
          Escolha a peça, confirme a foto que será usada e {model.name} veste
          para a vitrine.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {blocked ? <CreditsBlocked /> : null}

        {/* 1. peça */}
        {product ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-medium">{product.name}</p>
                {product.tryOnImage ? (
                  <Badge variant="success">
                    <Check /> Já tem prova
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {product.sku} · {product.category}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11"
              disabled={loading}
              onClick={() => {
                setProductId(undefined);
                setResult(null);
                setError(null);
              }}
            >
              Trocar peça
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar peça por nome, SKU ou categoria…"
              aria-label="Buscar peça para o provador"
            />
            {matches.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Nenhuma peça encontrada"
                description="Só produtos ativos entram no provador. Ajuste a busca ou ative a peça no cadastro."
              />
            ) : (
              <ul className="divide-y rounded-lg border">
                {matches.map((item) => {
                  const photo = storedPhoto(item);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => chooseProduct(item)}
                        className="flex w-full min-h-11 cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {item.name}
                            </span>
                            {item.tryOnImage ? (
                              <Badge variant="success">Já tem prova</Badge>
                            ) : null}
                            {photo ? (
                              <Badge variant="secondary">Com foto</Badge>
                            ) : null}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {item.sku} · {item.category}
                          </span>
                        </span>
                        <ArrowRight
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* 2. foto da peça */}
        {product ? (
          <div className="space-y-3">
            {stored ? (
              <div
                role="radiogroup"
                aria-label="Foto da peça usada na geração"
                className="grid gap-2 sm:grid-cols-2"
              >
                <SourceOption
                  selected={effectiveSource === "cadastrada"}
                  disabled={loading}
                  title="Usar a foto cadastrada"
                  description={
                    product.coverImage
                      ? "A foto de capa gerada para este produto."
                      : "A foto que você enviou no cadastro do produto."
                  }
                  onSelect={() => setSource("cadastrada")}
                />
                <SourceOption
                  selected={effectiveSource === "enviada"}
                  disabled={loading}
                  title="Enviar outra foto"
                  description="Use quando a peça mudou de cor, de estampa ou a foto ficou melhor."
                  onSelect={() => setSource("enviada")}
                />
              </div>
            ) : null}

            {effectiveSource === "enviada" ? (
              <ImageUpload
                id="provador-peca"
                value={upload}
                onChange={setUpload}
                label="Enviar a foto da peça"
                hint="A peça inteira, em fundo simples. JPG, PNG ou WEBP de até 4 MB."
                previewAlt={`Foto enviada da peça ${product.name}`}
                disabled={blocked || loading}
              />
            ) : null}

            <div className="flex items-center gap-3 rounded-lg border bg-secondary/40 p-3">
              {garment ? (
                <StudioImage
                  src={garment}
                  alt={`Foto que será usada para gerar a prova de ${product.name}`}
                  className="size-14 shrink-0"
                />
              ) : null}
              <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                {garment
                  ? effectiveSource === "cadastrada"
                    ? `Vamos usar a foto já cadastrada de ${product.name}.`
                    : `Vamos usar a foto que você acabou de enviar para ${product.name}.`
                  : "Envie a foto da peça para liberar a geração."}
              </p>
            </div>

            {loading ? (
              <GeneratingBox
                label={`${model.name} vestindo ${product.name}…`}
                className="max-w-sm"
              />
            ) : null}

            {error && !loading ? (
              <GenerationError message={error} onRetry={() => void generate()} />
            ) : null}

            {result && !loading ? (
              <div className="space-y-3">
                <StudioImage
                  src={result}
                  alt={`${model.name}, a modelo da loja, vestindo ${product.name} — imagem gerada por inteligência artificial`}
                  className="aspect-square w-full max-w-sm"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    disabled={blocked}
                    onClick={() => void generate()}
                  >
                    <RotateCcw /> Gerar de novo
                  </Button>
                  <Button
                    className="h-11"
                    onClick={() => {
                      toast.success("Imagem publicada na vitrine", {
                        description: `${product.name} já aparece com a prova no catálogo.`,
                      });
                      router.push(`/produtos/${product.id}`);
                    }}
                  >
                    <Check /> Usar no catálogo
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A imagem já está salva no produto e é a que a vitrine mostra.
                </p>
              </div>
            ) : null}

            {result || loading ? null : (
              <Button
                className="h-11 w-full sm:w-auto"
                disabled={blocked || !garment}
                onClick={() => void generate()}
              >
                <Sparkles /> Gerar no provador (1 crédito)
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Escolha entre a foto cadastrada e uma nova, com alvo de toque grande. */
function SourceOption({
  selected,
  disabled,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "min-h-11 cursor-pointer rounded-lg border p-3 text-left transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-primary bg-accent/60" : "hover:bg-secondary/50"
      )}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span
          aria-hidden
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : ""
          )}
        >
          {selected ? <Check className="size-3" /> : null}
        </span>
        {title}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
        {description}
      </span>
    </button>
  );
}
