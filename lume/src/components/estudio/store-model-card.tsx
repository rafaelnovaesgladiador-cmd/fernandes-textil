"use client";

import * as React from "react";
import { Lock, Sparkles, Trash2, UserRound, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/confirm-dialog";
import { Field } from "@/components/form-field";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { createStoreModel, removeStoreModel } from "@/lib/store";
import type { StoreModel, StoreModelOrigin } from "@/lib/types";
import { ImageUpload } from "./image-upload";
import {
  CreditsBlocked,
  GeneratingBox,
  GenerationError,
  StudioImage,
} from "./studio-common";

/**
 * Modelo exclusiva da loja — o ativo central do estúdio.
 *
 * Criada uma única vez, ela veste todas as peças: é o que faz a vitrine
 * parecer um catálogo de marca, e não um álbum de fotos avulsas.
 */

const SUGESTOES: string[] = [
  "mulher brasileira, 25 anos, cabelo longo castanho, pele morena, altura média",
  "mulher brasileira, 32 anos, cabelo curto preto, pele negra retinta, altura alta",
  "mulher brasileira, 28 anos, cabelo médio ondulado loiro, pele clara, altura média",
  "mulher brasileira, 40 anos, cabelo preso grisalho, pele parda, corpo curvilíneo",
];

const ORIGIN_LABEL: Record<StoreModelOrigin, string> = {
  descricao: "Criada por descrição escrita",
  imagem: "Criada a partir de uma imagem de referência",
};

export function StoreModelCard({
  model,
  remaining,
  sectionId,
}: {
  model: StoreModel | null;
  remaining: number;
  /** Âncora usada pelo provador para trazer a lojista até aqui. */
  sectionId: string;
}) {
  const { confirm, dialog } = useConfirm();
  const [replacing, setReplacing] = React.useState(false);

  const showForm = model === null || replacing;

  const askReplace = () =>
    confirm({
      title: "Criar uma nova modelo",
      description:
        "A modelo atual é substituída e as provas já geradas saem dos produtos — como a pessoa muda, as imagens antigas deixariam a vitrine com duas modelos diferentes. O histórico continua na galeria.",
      confirmLabel: "Criar nova modelo",
      destructive: true,
      onConfirm: () => setReplacing(true),
    });

  const askRemove = () =>
    confirm({
      title: "Remover a modelo da loja",
      description:
        "A modelo e as provas geradas com ela saem dos produtos. Para usar o provador de novo será preciso criar outra modelo, que será uma pessoa diferente.",
      confirmLabel: "Remover modelo",
      destructive: true,
      onConfirm: () => {
        removeStoreModel();
        setReplacing(false);
        toast.success("Modelo removida", {
          description: "As provas geradas com ela saíram dos produtos.",
        });
      },
    });

  return (
    <Card id={sectionId} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-primary" aria-hidden />
          Modelo da loja
        </CardTitle>
        <CardDescription>
          Crie uma vez e ela veste todas as suas peças — sempre a mesma pessoa,
          em todas as fotos da vitrine.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {model && !replacing ? (
          <ModelSummary
            model={model}
            onReplace={askReplace}
            onRemove={askRemove}
          />
        ) : null}

        {showForm ? (
          <ModelForm
            remaining={remaining}
            replacing={replacing}
            onCancel={replacing ? () => setReplacing(false) : undefined}
            onCreated={() => setReplacing(false)}
          />
        ) : null}
      </CardContent>
      {dialog}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Modelo já criada
// ---------------------------------------------------------------------------

function ModelSummary({
  model,
  onReplace,
  onRemove,
}: {
  model: StoreModel;
  onReplace: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
      <StudioImage
        src={model.image}
        alt={`Retrato da modelo ${model.name}, gerado por inteligência artificial`}
        className="aspect-square w-full"
      />

      <div className="space-y-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{model.name}</p>
            <Badge variant="success">Ativa</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {ORIGIN_LABEL[model.origin]} · {formatDateTime(model.createdAt)}
          </p>
        </div>

        {model.description ? (
          <p className="rounded-lg border bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
            &ldquo;{model.description}&rdquo;
          </p>
        ) : null}

        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            A identidade fica travada: toda geração do provador usa exatamente
            esta pessoa. Só a peça muda de uma imagem para a outra.
          </span>
        </p>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={onReplace}>
            <UserRoundPlus /> Criar nova modelo
          </Button>
          <Button variant="ghost" className="h-11" onClick={onRemove}>
            <Trash2 /> Remover modelo
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

function ModelForm({
  remaining,
  replacing,
  onCancel,
  onCreated,
}: {
  remaining: number;
  replacing: boolean;
  onCancel?: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [origin, setOrigin] = React.useState<StoreModelOrigin>("descricao");
  const [description, setDescription] = React.useState("");
  const [reference, setReference] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  const blocked = remaining <= 0;
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  const nameError =
    touched && trimmedName.length < 2
      ? "Dê um nome à modelo, ex.: Helena. Ele aparece só para você."
      : undefined;
  const descriptionError =
    touched && origin === "descricao" && trimmedDescription.length < 12
      ? "Descreva a modelo com pelo menos uma frase — idade, cabelo, tom de pele e altura."
      : undefined;
  const referenceError =
    touched && origin === "imagem" && !reference
      ? "Envie uma imagem de referência para criar a modelo."
      : undefined;

  const ready =
    trimmedName.length >= 2 &&
    (origin === "descricao" ? trimmedDescription.length >= 12 : Boolean(reference));

  const submit = async () => {
    setTouched(true);
    if (!ready || blocked || loading) return;
    setLoading(true);
    setError(null);
    const result = await createStoreModel({
      name: trimmedName,
      origin,
      description: origin === "descricao" ? trimmedDescription : undefined,
      reference: origin === "imagem" ? reference : undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível criar a modelo.");
      return;
    }
    toast.success("Modelo criada", {
      description: `${trimmedName} já pode vestir as suas peças no provador.`,
    });
    setName("");
    setDescription("");
    setReference(undefined);
    setTouched(false);
    onCreated();
  };

  return (
    <div className="space-y-4">
      {replacing ? null : (
        <p className="rounded-lg border bg-accent/50 p-3 text-sm leading-relaxed text-accent-foreground">
          Sem modelo, cada peça precisa de uma foto própria. Com ela, você envia
          a foto da peça e recebe a imagem da mesma pessoa vestindo — o que faz
          a cliente comparar looks em vez de imaginar o caimento.
        </p>
      )}

      {blocked ? <CreditsBlocked /> : null}

      <Field
        label="Nome da modelo"
        htmlFor="modelo-nome"
        required
        error={nameError}
        hint="Um apelido para você reconhecer nas gerações. A cliente não vê este nome."
      >
        <Input
          id="modelo-nome"
          value={name}
          maxLength={40}
          disabled={loading}
          placeholder="Ex.: Helena"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Tabs
        value={origin}
        onValueChange={(value) => setOrigin(value as StoreModelOrigin)}
        className="space-y-3"
      >
        <TabsList>
          <TabsTrigger value="descricao">Por descrição</TabsTrigger>
          <TabsTrigger value="imagem">Por imagem</TabsTrigger>
        </TabsList>

        <TabsContent value="descricao" className="space-y-3">
          <Field
            label="Como é a modelo"
            htmlFor="modelo-descricao"
            required
            error={descriptionError}
            hint="Quanto mais específico, mais próxima do público da sua loja ela fica."
          >
            <Textarea
              id="modelo-descricao"
              rows={3}
              maxLength={280}
              disabled={loading}
              value={description}
              placeholder="Ex.: mulher brasileira, 25 anos, cabelo longo castanho, pele morena, altura média"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Sugestões — toque para usar como ponto de partida:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={loading}
                  onClick={() => setDescription(option)}
                  className="cursor-pointer rounded-full border bg-card px-3 py-2 text-left text-xs leading-snug transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="imagem" className="space-y-3">
          <Field
            label="Imagem de referência"
            htmlFor="modelo-referencia-arquivo"
            required
            error={referenceError}
            hint="Uma foto de corpo inteiro, fundo simples e boa luz dá o melhor resultado."
          >
            <ImageUpload
              id="modelo-referencia"
              value={reference}
              onChange={setReference}
              label="Enviar imagem de referência"
              previewAlt="Imagem de referência enviada para criar a modelo"
              disabled={blocked || loading}
            />
          </Field>
        </TabsContent>
      </Tabs>

      {loading ? (
        <GeneratingBox
          label={`Criando ${trimmedName}…`}
          className="max-w-sm"
        />
      ) : null}

      {error && !loading ? (
        <GenerationError message={error} onRetry={() => void submit()} />
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          className="h-11"
          disabled={blocked || loading}
          onClick={() => void submit()}
        >
          <Sparkles /> {loading ? "Gerando…" : "Criar modelo (1 crédito)"}
        </Button>
        {onCancel ? (
          <Button
            variant="ghost"
            className="h-11"
            disabled={loading}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
