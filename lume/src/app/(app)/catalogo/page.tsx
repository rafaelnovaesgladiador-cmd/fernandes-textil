"use client";

import { BookOpen } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatNumber } from "@/lib/format";
import { demoProducts } from "@/lib/mock";

export default function CatalogoPage() {
  const promo = demoProducts.filter((p) => p.promoPrice).length;
  const collections = new Set(demoProducts.map((p) => p.collection)).size;

  return (
    <ModulePreview
      title="Catálogo virtual"
      description="Vitrine compartilhável que gera pedidos e conversas no WhatsApp."
      stage={4}
      icon={BookOpen}
      stats={[
        { label: "Produtos publicáveis", value: formatNumber(demoProducts.length) },
        { label: "Coleções", value: formatNumber(collections) },
        { label: "Peças em promoção", value: formatNumber(promo) },
        { label: "Canal de pedidos", value: "WhatsApp" },
      ]}
      features={[
        "Página pública com a identidade visual da loja",
        "Coleções, categorias, busca e filtros",
        "Cores, tamanhos e disponibilidade em tempo real",
        "Montagem de pedido e lista de interesse",
        "Botão de WhatsApp em cada produto",
        "Opção de ocultar preços para atacado",
        "Destaques, lançamentos e promoções",
        "Link compartilhável no Instagram e no WhatsApp",
      ]}
    />
  );
}
