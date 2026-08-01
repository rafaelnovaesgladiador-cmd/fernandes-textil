"use client";

import { useState } from "react";
import { Rocket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Toda ação que só chega em etapas futuras responde com este diálogo —
 * nenhum botão do protótipo fica sem resposta visual.
 */
export function ComingSoonDialog({
  open,
  onOpenChange,
  feature,
  stage,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  stage: 2 | 3 | 4 | 5;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Rocket className="size-5" />
          </div>
          <DialogTitle>{feature}</DialogTitle>
          <DialogDescription>
            {description ??
              "Esta funcionalidade já está desenhada na arquitetura do produto e chega na próxima etapa do protótipo."}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Badge variant="accent">Em breve — Etapa {stage}</Badge>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useComingSoon() {
  const [state, setState] = useState<{
    open: boolean;
    feature: string;
    stage: 2 | 3 | 4 | 5;
    description?: string;
  }>({ open: false, feature: "", stage: 2 });

  const show = (
    feature: string,
    stage: 2 | 3 | 4 | 5 = 2,
    description?: string
  ) => setState({ open: true, feature, stage, description });

  const dialog = (
    <ComingSoonDialog
      open={state.open}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      feature={state.feature}
      stage={state.stage}
      description={state.description}
    />
  );

  return { show, dialog };
}
