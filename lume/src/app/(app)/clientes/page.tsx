"use client";

import { Users } from "lucide-react";
import { ModulePreview } from "@/components/module-preview";
import { formatNumber } from "@/lib/format";
import { demoCustomers } from "@/lib/mock";
import { inactiveCustomers } from "@/lib/metrics";

export default function ClientesPage() {
  const inactive = inactiveCustomers(120).length;
  const news = demoCustomers.filter((c) => c.profile === "novo").length;
  const consent = demoCustomers.filter((c) => c.marketingConsent).length;

  return (
    <ModulePreview
      title="Clientes"
      description="CRM feito para loja de moda: tamanhos, preferências e recompra."
      stage={2}
      icon={Users}
      stats={[
        { label: "Clientes cadastrados", value: formatNumber(demoCustomers.length) },
        { label: "Novos (últimos 45 dias)", value: formatNumber(news) },
        { label: "Inativos (+120 dias)", value: formatNumber(inactive) },
        { label: "Com consentimento LGPD", value: formatNumber(consent) },
      ]}
      features={[
        "Perfil com total gasto, ticket médio, frequência e última compra",
        "Tamanho mais comprado, categorias preferidas e observações",
        "Segmentos: VIP, novos, recorrentes, inativos e aniversariantes",
        "Clientes sem comprar há 30/60/90/120 dias",
        "Saldo de crediário em aberto por cliente",
        "Ações simuladas: mensagem, campanha, cupom e lembrete",
        "Vendedora responsável e origem do cliente",
        "Consentimento de comunicação (LGPD) registrado",
      ]}
    />
  );
}
