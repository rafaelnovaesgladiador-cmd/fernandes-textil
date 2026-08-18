"use client";

import * as React from "react";
import { Download, ImageOff, Images } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatNumber } from "@/lib/format";
import { AI_GENERATION_LABELS, type AiGeneration, type AiGenerationKind } from "@/lib/types";
import { StudioImage } from "./studio-common";

/**
 * Galeria de gerações.
 *
 * É o extrato do estúdio: mostra o que foi gerado, o que falhou e quanto cada
 * tentativa custou — inclusive as imagens que saíram dos produtos depois de
 * uma troca de modelo.
 */

const ALL = "todas";

const KINDS: AiGenerationKind[] = ["melhoria", "modelo", "provador"];

/** Nome do arquivo baixado, legível na pasta de downloads. */
function fileName(generation: AiGeneration): string {
  const slug = generation.subject
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${generation.kind}-${slug || generation.id}.svg`;
}

export function GenerationGallery({
  generations,
}: {
  generations: AiGeneration[];
}) {
  const [kind, setKind] = React.useState<string>(ALL);
  const [openId, setOpenId] = React.useState<string | null>(null);

  const visible = React.useMemo(
    () =>
      kind === ALL
        ? generations
        : generations.filter((item) => item.kind === kind),
    [generations, kind]
  );

  const opened = visible.find((item) => item.id === openId) ?? null;

  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Images className="size-4 text-primary" aria-hidden />
            Galeria de gerações
          </CardTitle>
          <CardDescription>
            {generations.length > 0
              ? `${formatNumber(generations.length)} ${
                  generations.length === 1 ? "geração" : "gerações"
                } no histórico, da mais recente para a mais antiga.`
              : "Tudo o que você gerar no estúdio fica registrado aqui."}
          </CardDescription>
        </div>
        {generations.length > 0 ? (
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger
              aria-label="Filtrar gerações por tipo"
              className="w-full sm:w-48"
            >
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {KINDS.map((option) => (
                <SelectItem key={option} value={option}>
                  {AI_GENERATION_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </CardHeader>

      <CardContent>
        {visible.length === 0 ? (
          <EmptyState
            icon={Images}
            title={
              generations.length === 0
                ? "Nenhuma geração ainda"
                : "Nenhuma geração deste tipo"
            }
            description={
              generations.length === 0
                ? "Crie a modelo da loja, melhore a foto de uma peça ou use o provador: cada imagem gerada aparece aqui, com data, tipo e créditos consumidos."
                : "Troque o filtro para ver as gerações dos outros tipos."
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((generation) => (
              <li key={generation.id}>
                <GenerationTile
                  generation={generation}
                  onOpen={() => setOpenId(generation.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <GenerationDialog
        generation={opened}
        onClose={() => setOpenId(null)}
      />
    </Card>
  );
}

function GenerationTile({
  generation,
  onOpen,
}: {
  generation: AiGeneration;
  onOpen: () => void;
}) {
  const label = AI_GENERATION_LABELS[generation.kind];
  const failed = generation.status === "falhou";

  const media = generation.image ? (
    <StudioImage
      src={generation.image}
      alt={`${label}: ${generation.subject} — imagem gerada por inteligência artificial`}
      className="aspect-square w-full rounded-lg"
    />
  ) : (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
      <ImageOff className="size-6" aria-hidden />
    </div>
  );

  const body = (
    <>
      {media}
      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary">{label}</Badge>
          {failed ? <Badge variant="critical">Falhou</Badge> : null}
        </div>
        <p className="truncate text-sm font-medium">{generation.subject}</p>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(generation.createdAt)}
        </p>
        <p className="text-xs text-muted-foreground">
          {generation.creditsUsed === 0
            ? "Nenhum crédito cobrado"
            : `${formatNumber(generation.creditsUsed)} crédito`}
        </p>
        {failed && generation.error ? (
          <p className="text-xs leading-relaxed text-critical">
            {generation.error}
          </p>
        ) : null}
      </div>
    </>
  );

  if (!generation.image) {
    return <div className="rounded-xl border p-2">{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Ver ${AI_GENERATION_LABELS[generation.kind]} de ${generation.subject} em tamanho maior`}
      className="w-full cursor-pointer rounded-xl border p-2 text-left transition-colors hover:bg-secondary/40 focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
    >
      {body}
    </button>
  );
}

function GenerationDialog({
  generation,
  onClose,
}: {
  generation: AiGeneration | null;
  onClose: () => void;
}) {
  const label = generation ? AI_GENERATION_LABELS[generation.kind] : "";

  return (
    <Dialog
      open={generation !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        {generation && generation.image ? (
          <>
            <DialogHeader>
              <DialogTitle>{generation.subject}</DialogTitle>
              <DialogDescription>
                {label} · {formatDateTime(generation.createdAt)} ·{" "}
                {formatNumber(generation.creditsUsed)}{" "}
                {generation.creditsUsed === 1 ? "crédito" : "créditos"}
              </DialogDescription>
            </DialogHeader>

            <StudioImage
              src={generation.image}
              alt={`${label}: ${generation.subject} — imagem gerada por inteligência artificial`}
              className="w-full"
              imageClassName="max-h-[60vh]"
            />

            <Button asChild className="h-11">
              <a href={generation.image} download={fileName(generation)}>
                <Download /> Baixar imagem
              </a>
            </Button>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
