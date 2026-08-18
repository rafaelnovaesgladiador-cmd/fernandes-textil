"use client";

import * as React from "react";
import { Info, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Peças compartilhadas do estúdio de imagens.
 *
 * Concentram as três situações que toda geração atravessa — esperando,
 * pronta e falhou — para que os três recursos (foto de capa, modelo e
 * provador) contem a mesma história com as mesmas palavras.
 */

/** Tempo típico de uma geração, usado nos avisos de espera. */
export const GENERATION_HINT = "Costuma levar de 2 a 3 segundos.";

/**
 * Moldura das imagens do estúdio.
 *
 * Usa `<img>` em vez de `next/image` de propósito: as imagens são data URIs
 * produzidos em tempo de execução, sem arquivo no servidor para o otimizador
 * processar.
 */
export function StudioImage({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-secondary/50",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data URI gerado em tempo de execução */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("size-full object-contain", imageClassName)}
      />
    </div>
  );
}

/** Área do resultado enquanto o provedor trabalha. */
export function GeneratingBox({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/60 p-6 text-center",
        className
      )}
    >
      <span
        aria-hidden
        className="flex size-11 animate-pulse items-center justify-center rounded-full bg-primary/15 text-primary"
      >
        <Sparkles className="size-5" />
      </span>
      <p className="text-sm font-medium">{label}</p>
      <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
        {GENERATION_HINT} Pode manter esta tela aberta — avisamos assim que a
        imagem ficar pronta.
      </p>
    </div>
  );
}

/**
 * Erro de geração.
 *
 * A mensagem vem pronta da ação, em português, e é exibida como veio. O aviso
 * do crédito é fixo porque a regra é do sistema: falha não cobra.
 */
export function GenerationError({
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  className,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "space-y-3 rounded-xl border border-critical/40 bg-critical/8 p-4",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-critical"
          aria-hidden
        />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-critical">
            A geração não deu certo
          </p>
          <p className="text-sm leading-relaxed">{message}</p>
          <p className="text-xs text-muted-foreground">
            O crédito não foi cobrado: ele já voltou para o seu saldo.
          </p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" className="h-11 w-full sm:w-auto" onClick={onRetry}>
          <RotateCcw /> {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** Bloqueio por cota zerada, exibido antes de qualquer tentativa. */
export function CreditsBlocked({
  action,
  className,
}: {
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "space-y-3 rounded-xl border border-warning/50 bg-warning/10 p-4",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-medium">Gerações bloqueadas</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Seus créditos acabaram. Adicione créditos para voltar a criar
            imagens — nada é gerado enquanto o saldo estiver zerado.
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** Aviso permanente: as imagens são geradas e o provedor está simulado. */
export function AiDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground",
        className
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        Imagens geradas por inteligência artificial — todas saem com uma marca
        d&apos;água discreta. Nesta demonstração o provedor é simulado: os
        resultados são exemplos, não fotos reais das suas peças.
      </span>
    </p>
  );
}
