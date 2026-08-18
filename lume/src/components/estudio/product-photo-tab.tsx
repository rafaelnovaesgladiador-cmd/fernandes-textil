"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Shirt, Sparkles, Wand } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { enhanceProductPhoto } from "@/lib/store";
import type { Product } from "@/lib/types";
import { ImageUpload } from "./image-upload";
import {
  AiDisclaimer,
  CreditsBlocked,
  GeneratingBox,
  GenerationError,
  StudioImage,
} from "./studio-common";

/** Endereço do estúdio já apontando para a peça. */
export function studioHref(productId: string): string {
  return `/catalogo?aba=estudio&produto=${encodeURIComponent(productId)}`;
}

/**
 * Aba "Foto" do produto.
 *
 * Recebe a foto crua da lojista — normalmente tirada no celular, em cima da
 * arara — e devolve a capa padronizada que entra no catálogo. A comparação
 * lado a lado é o que convence: mesma peça, apresentação de loja.
 */
export function ProductPhotoTab({
  product,
  remaining,
}: {
  product: Product;
  remaining: number;
}) {
  const [photo, setPhoto] = React.useState<string | undefined>(
    product.sourcePhoto
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const blocked = remaining <= 0;
  const hasBoth = Boolean(product.sourcePhoto && product.coverImage);

  const generate = async () => {
    if (!photo || blocked || loading) return;
    setLoading(true);
    setError(null);
    const result = await enhanceProductPhoto({
      productId: product.id,
      source: photo,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível gerar a foto de capa.");
      return;
    }
    toast.success("Foto de capa pronta", {
      description: `${product.name} já aparece com a nova foto no catálogo.`,
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand className="size-4 text-primary" aria-hidden />
            Foto de capa
          </CardTitle>
          <CardDescription>
            Envie a foto da peça como ela está — o estúdio recorta, limpa o
            fundo e padroniza o enquadramento para a vitrine.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {blocked ? (
            <CreditsBlocked
              action={
                <Button variant="outline" className="h-11" asChild>
                  <Link href={studioHref(product.id)}>
                    <Sparkles /> Adicionar créditos no estúdio
                  </Link>
                </Button>
              }
            />
          ) : null}

          <ImageUpload
            id="produto-foto"
            value={photo}
            onChange={(value) => {
              setPhoto(value);
              setError(null);
            }}
            label="Enviar a foto da peça"
            hint="Peça inteira, boa luz e fundo simples. JPG, PNG ou WEBP de até 4 MB."
            previewAlt={`Foto enviada de ${product.name}`}
            disabled={blocked || loading}
          />

          {loading ? (
            <GeneratingBox label={`Gerando a capa de ${product.name}…`} />
          ) : null}

          {error && !loading ? (
            <GenerationError message={error} onRetry={() => void generate()} />
          ) : null}

          <Button
            className="h-11 w-full sm:w-auto"
            disabled={blocked || !photo || loading}
            onClick={() => void generate()}
          >
            <Sparkles />{" "}
            {loading
              ? "Gerando…"
              : product.coverImage
                ? "Gerar de novo (1 crédito)"
                : "Gerar foto de capa (1 crédito)"}
          </Button>

          <AiDisclaimer />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {hasBoth ? "Antes e depois" : "Resultado"}
            </CardTitle>
            <CardDescription>
              {hasBoth
                ? "À esquerda a foto que você enviou; à direita a capa gerada, que é a imagem usada no catálogo."
                : "Assim que a capa for gerada, ela aparece aqui ao lado da foto original."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {product.sourcePhoto || product.coverImage ? (
              <div className="grid grid-cols-2 gap-3">
                <figure className="space-y-1.5">
                  {product.sourcePhoto ? (
                    <StudioImage
                      src={product.sourcePhoto}
                      alt={`Foto original enviada de ${product.name}`}
                      className="aspect-square w-full"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                      Sem foto enviada
                    </div>
                  )}
                  <figcaption className="text-xs text-muted-foreground">
                    Enviada por você
                  </figcaption>
                </figure>

                <figure className="space-y-1.5">
                  {product.coverImage ? (
                    <StudioImage
                      src={product.coverImage}
                      alt={`Foto de capa de ${product.name} gerada por inteligência artificial`}
                      className="aspect-square w-full"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed bg-muted/50 p-3 text-center text-xs text-muted-foreground">
                      Capa ainda não gerada
                    </div>
                  )}
                  <figcaption className="text-xs text-muted-foreground">
                    Gerada por IA · usada no catálogo
                  </figcaption>
                </figure>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Este produto ainda não tem foto. Envie uma ao lado para gerar a
                capa.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="size-4 text-primary" aria-hidden />
              No provador
            </CardTitle>
            <CardDescription>
              A modelo da loja vestindo esta peça — é a imagem que a vitrine
              mostra primeiro, porque peça vestida vende mais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.tryOnImage ? (
              <StudioImage
                src={product.tryOnImage}
                alt={`Modelo da loja vestindo ${product.name} — imagem gerada por inteligência artificial`}
                className="aspect-square w-full max-w-56"
              />
            ) : null}
            <Button variant="outline" className="h-11" asChild>
              <Link href={studioHref(product.id)}>
                {product.tryOnImage ? "Gerar outra prova" : "Ver no provador"}
                <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
