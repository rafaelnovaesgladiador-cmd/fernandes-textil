"use client";

import { Shirt } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatBRL, formatNumber } from "@/lib/format";
import { demoProducts, demoVariants } from "@/lib/mock";
import { stockSummary } from "@/lib/metrics";

export default function ProdutosPage() {
  const stock = stockSummary();
  const categories = new Set(demoProducts.map((p) => p.category)).size;

  return (
    <ModulePreview
      title="Produtos"
      description="Catálogo com variações por cor e tamanho, do jeito que loja de roupa funciona."
      stage={2}
      icon={Shirt}
      stats={[
        { label: "Produtos ativos", value: formatNumber(demoProducts.length) },
        { label: "Variações (cor/tamanho)", value: formatNumber(demoVariants.length) },
        { label: "Categorias", value: formatNumber(categories) },
        { label: "Potencial de venda", value: formatBRL(stock.stockPotential) },
      ]}
      features={[
        "Cadastro com categoria, coleção, marca, fornecedor e material",
        "Variações por cor e tamanho, cada uma com SKU e código de barras",
        "Custo, preço, preço promocional e margem calculada",
        "Visualização em tabela e em cards (mobile-first)",
        "Ações: editar, duplicar, inativar, ajustar estoque",
        "Estoque mínimo por variação e localização física",
        "Adicionar ao catálogo virtual e criar promoção",
        "Impressão simulada de etiquetas",
      ]}
    />
  );
}
