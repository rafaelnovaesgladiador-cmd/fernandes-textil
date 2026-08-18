"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const NEW_OPTION = "__nova__";

/**
 * Categoria: escolhe entre as que a loja já usa ou digita uma nova — evita
 * criar "Vestidos", "vestido" e "VESTIDOS" como categorias diferentes.
 */
export function CategorySelect({
  id,
  value,
  options,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          id={id}
          autoFocus
          value={value}
          placeholder="Nome da nova categoria"
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setCreating(false);
            onChange(options[0] ?? "");
          }}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={options.includes(value) ? value : ""}
      onValueChange={(next) => {
        if (next === NEW_OPTION) {
          setCreating(true);
          onChange("");
          return;
        }
        onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Escolha a categoria" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
        <SelectSeparator />
        <SelectItem value={NEW_OPTION}>+ Nova categoria…</SelectItem>
      </SelectContent>
    </Select>
  );
}
