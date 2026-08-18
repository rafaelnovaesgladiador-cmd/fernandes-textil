"use client";

import * as React from "react";
import { Camera, ImagePlus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StudioImage } from "./studio-common";

/**
 * Envio de imagem com prévia.
 *
 * Converte o arquivo em data URI no próprio navegador: o estúdio trabalha com
 * a imagem em memória e o mesmo valor pode ser guardado no produto sem depender
 * de upload para um servidor. Nada sai do aparelho até a geração começar.
 */

/** Limite de tamanho do arquivo. Acima disso a leitura fica lenta no celular. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ACCEPT = "image/*";

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
}

/** Valida tipo e tamanho antes de gastar tempo lendo o arquivo. */
function validate(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Este arquivo não é uma imagem. Escolha um JPG, PNG ou WEBP — o formato que o celular salva ao tirar uma foto.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `A imagem tem ${formatMB(file.size)} e o limite é ${formatMB(
      MAX_IMAGE_BYTES
    )}. Tire a foto em uma resolução menor ou reduza o arquivo antes de enviar.`;
  }
  return null;
}

function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("leitura inválida"));
    };
    reader.onerror = () => reject(new Error("falha na leitura"));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  id,
  value,
  onChange,
  label = "Enviar foto",
  hint,
  previewAlt = "Prévia da imagem enviada",
  disabled = false,
  className,
}: {
  /** Prefixo dos ids dos inputs — precisa ser único na tela. */
  id: string;
  /** Imagem atual, em data URI. */
  value?: string;
  onChange: (value: string | undefined) => void;
  /** Chamada para ação na área vazia. */
  label?: string;
  hint?: string;
  previewAlt?: string;
  disabled?: boolean;
  className?: string;
}) {
  const fileInput = React.useRef<HTMLInputElement>(null);
  const cameraInput = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [reading, setReading] = React.useState(false);

  const accept = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const problem = validate(file);
      if (problem) {
        setError(problem);
        return;
      }
      setError(null);
      setReading(true);
      try {
        onChange(await readAsDataUri(file));
      } catch {
        setError(
          "Não foi possível ler o arquivo. Tente novamente ou escolha outra imagem."
        );
      } finally {
        setReading(false);
      }
    },
    [onChange]
  );

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    void accept(event.target.files?.[0]);
    // Zera o input para que escolher o mesmo arquivo de novo dispare o evento.
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    void accept(event.dataTransfer.files?.[0]);
  };

  const remove = () => {
    setError(null);
    onChange(undefined);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={fileInput}
        id={`${id}-arquivo`}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={handleInput}
      />
      {/* `capture` abre a câmera direto no celular; no computador cai no
          seletor de arquivos, por isso o botão de arquivo continua existindo. */}
      <input
        ref={cameraInput}
        id={`${id}-camera`}
        type="file"
        accept={ACCEPT}
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={handleInput}
      />

      {value ? (
        <div className="space-y-2">
          <StudioImage
            src={value}
            alt={previewAlt}
            className="aspect-square w-full max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 sm:flex-none"
              disabled={disabled || reading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload /> Trocar imagem
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 flex-1 sm:flex-none"
              disabled={disabled || reading}
              onClick={remove}
            >
              <Trash2 /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "rounded-xl border border-dashed p-5 text-center transition-colors",
            dragging ? "border-primary bg-accent/60" : "bg-muted/40",
            disabled && "opacity-60"
          )}
        >
          <span
            aria-hidden
            className="mx-auto flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          >
            <ImagePlus className="size-5" />
          </span>
          <p className="mt-3 text-sm font-medium">{label}</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            {hint ??
              "Arraste a imagem para cá ou escolha um arquivo. JPG, PNG ou WEBP de até 4 MB."}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={disabled || reading}
              onClick={() => fileInput.current?.click()}
            >
              <Upload /> {reading ? "Lendo a imagem…" : "Escolher arquivo"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={disabled || reading}
              onClick={() => cameraInput.current?.click()}
            >
              <Camera /> Tirar foto
            </Button>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
