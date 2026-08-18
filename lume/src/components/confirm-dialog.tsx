"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
}

const CLOSED: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "Confirmar",
  destructive: false,
  onConfirm: () => {},
};

/**
 * Confirmação para ações que não são triviais de desfazer (cancelar venda,
 * fechar caixa). Devolve o diálogo pronto e a função que o abre.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(CLOSED);

  const confirm = (options: {
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }) =>
    setState({
      open: true,
      title: options.title,
      description: options.description,
      confirmLabel: options.confirmLabel ?? "Confirmar",
      destructive: options.destructive ?? false,
      onConfirm: options.onConfirm,
    });

  const dialog = (
    <Dialog
      open={state.open}
      onOpenChange={(open) => !open && setState((s) => ({ ...s, open: false }))}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogDescription>{state.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setState((s) => ({ ...s, open: false }))}
          >
            Voltar
          </Button>
          <Button
            variant={state.destructive ? "destructive" : "default"}
            onClick={() => {
              state.onConfirm();
              setState((s) => ({ ...s, open: false }));
            }}
          >
            {state.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
