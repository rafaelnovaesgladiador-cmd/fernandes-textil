import { createRng } from "@/lib/rng";
import { demoDay } from "@/lib/dates";
import type { ActivityLog } from "@/lib/types";
import { COMPANY_ID, demoSellers, demoUser } from "./core";

const ACTIONS: Array<{
  action: string;
  entity: string;
  details: string[];
}> = [
  {
    action: "Venda finalizada",
    entity: "Venda",
    details: [
      "Venda #1832 — 3 itens, Pix",
      "Venda #1829 — 1 item, cartão de crédito 3x",
      "Venda #1825 — 2 itens, crediário",
    ],
  },
  {
    action: "Ajuste de estoque",
    entity: "Estoque",
    details: [
      "Vestido Midi Canelado (Preto/M): 4 → 6 peças — conferência física",
      "Blusa Cropped de Tricô (Rosa Seco/P): 2 → 1 peça — avaria",
      "Calça Wide Leg Jeans (Jeans Claro/G): entrada de 8 peças — NF 8214",
    ],
  },
  {
    action: "Cadastro de cliente",
    entity: "Cliente",
    details: [
      "Nova cliente via Instagram — consentimento de comunicação registrado",
      "Nova cliente na loja — vendedora responsável atribuída",
    ],
  },
  {
    action: "Alteração de preço",
    entity: "Produto",
    details: [
      "Trench Coat Longo: R$ 299,90 → R$ 249,90 (promoção de inverno)",
      "Saia Midi Plissada: R$ 129,90 → R$ 119,90",
    ],
  },
  {
    action: "Despesa registrada",
    entity: "Financeiro",
    details: [
      "Tráfego pago + impulsionamentos Instagram — R$ 890,00",
      "Sacolas e embalagens — R$ 312,40",
    ],
  },
  {
    action: "Login realizado",
    entity: "Segurança",
    details: ["Acesso via navegador — Campinas/SP", "Acesso via celular — Campinas/SP"],
  },
];

function buildActivityLog(): ActivityLog[] {
  const rng = createRng(77082026);
  const log: ActivityLog[] = [];
  const actors = [
    { id: demoUser.id, name: demoUser.name },
    ...demoSellers.map((s) => ({ id: s.userId, name: s.name })),
  ];

  let index = 0;
  for (let offset = -9; offset <= 0; offset++) {
    const entriesToday = offset === 0 ? 4 : rng.int(2, 5);
    for (let i = 0; i < entriesToday; i++) {
      index += 1;
      const template = rng.pick(ACTIONS);
      const actor = rng.pick(actors);
      log.push({
        id: `log_${String(index).padStart(3, "0")}`,
        companyId: COMPANY_ID,
        userId: actor.id,
        userName: actor.name,
        action: template.action,
        entity: template.entity,
        detail: rng.pick(template.details),
        date: demoDay(offset, rng.int(9, 19), rng.int(0, 59)).toISOString(),
      });
    }
  }

  return log.sort((a, b) => b.date.localeCompare(a.date));
}

export const demoActivityLog: ActivityLog[] = buildActivityLog();
