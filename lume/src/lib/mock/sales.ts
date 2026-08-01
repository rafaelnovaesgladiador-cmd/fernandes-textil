import { createRng } from "@/lib/rng";
import { demoDay, weekdayIndex } from "@/lib/dates";
import type {
  PaymentMethod,
  Sale,
  SaleItem,
  SaleStatus,
  SalesChannel,
} from "@/lib/types";
import { COMPANY_ID, demoSellers } from "./core";
import { demoCustomers } from "./customers";
import { demoProducts, variantsByProduct } from "./products";

/** Dias de histórico gerado (aprox. 6 meses). */
export const HISTORY_DAYS = 184;

// Fator por dia da semana (loja fecha aos domingos; sábado é o pico).
const WEEKDAY_FACTOR = [0, 0.75, 0.85, 0.9, 1.0, 1.35, 1.7];

const CHANNELS: SalesChannel[] = ["loja", "whatsapp", "instagram"];
const CHANNEL_WEIGHTS = [0.62, 0.23, 0.15];

const PAYMENTS: PaymentMethod[] = ["pix", "credito", "debito", "dinheiro", "crediario"];
const PAYMENT_WEIGHTS = [0.3, 0.34, 0.16, 0.12, 0.08];

// Vendedoras com desempenhos distintos (alimenta ranking e comissões).
const SELLER_WEIGHTS = [1.35, 1.15, 0.95, 0.75];

function buildSales(): Sale[] {
  const rng = createRng(11082026);
  const sales: Sale[] = [];
  let saleIndex = 0;
  let itemIndex = 0;

  const sellableProducts = demoProducts.filter((p) => p.demandWeight > 0);
  const stalledProducts = demoProducts.filter((p) => p.demandWeight === 0);

  for (let offset = -(HISTORY_DAYS - 1); offset <= 0; offset++) {
    const dayStart = demoDay(offset, 0);
    const weekday = weekdayIndex(dayStart);
    // Crescimento suave ao longo do semestre (~ +35%), com aceleração extra
    // nos últimos 40 dias (mais volume, porém com mais desconto).
    let growth = 0.82 + ((offset + HISTORY_DAYS) / HISTORY_DAYS) * 0.35;
    if (offset >= -40) growth *= 1.22;
    const base = 6.6 * WEEKDAY_FACTOR[weekday] * growth;
    let count = Math.round(base + rng.float(-1.2, 1.6));
    if (weekday === 0) count = rng.chance(0.25) ? 1 : 0;
    // "Hoje" na demo é um sábado em andamento (dia parcial).
    if (offset === 0) count = Math.max(3, Math.round(count * 0.55));

    for (let i = 0; i < count; i++) {
      saleIndex += 1;
      const hour = rng.int(9, offset === 0 ? 15 : 19);
      const date = demoDay(offset, hour, rng.int(0, 59));

      // Últimos 40 dias: descontos mais agressivos — a loja vende mais,
      // mas a margem cai (sustenta o insight do Dashboard).
      const discountChance = offset >= -40 ? 0.62 : 0.22;
      const discountPercent = rng.chance(discountChance)
        ? offset >= -40
          ? rng.float(0.1, 0.26)
          : rng.float(0.04, 0.12)
        : 0;

      const itemCount = rng.weighted([1, 2, 3], [0.56, 0.3, 0.14]);
      const items: SaleItem[] = [];
      let gross = 0;
      let totalCost = 0;

      for (let j = 0; j < itemCount; j++) {
        // Produtos "parados" só aparecem em vendas com mais de ~110 dias.
        const pool =
          offset < -110 && rng.chance(0.12) ? stalledProducts : sellableProducts;
        const product = rng.weighted(
          pool,
          pool.map((p) => Math.max(p.demandWeight, 1))
        );
        const variants = variantsByProduct.get(product.id) ?? [];
        if (variants.length === 0) continue;
        const variant = rng.weighted(
          variants,
          variants.map((v) => (v.size === "M" ? 2.1 : v.size === "P" ? 1.3 : 1))
        );
        const quantity = rng.chance(0.08) ? 2 : 1;
        const unitPrice = product.promoPrice ?? product.price;

        itemIndex += 1;
        items.push({
          id: `item_${String(itemIndex).padStart(5, "0")}`,
          saleId: `ven_${String(saleIndex).padStart(4, "0")}`,
          productId: product.id,
          variantId: variant.id,
          quantity,
          unitPrice,
          unitCost: product.cost,
          discount: 0,
        });
        gross += unitPrice * quantity;
        totalCost += product.cost * quantity;
      }

      if (items.length === 0) continue;

      const discount = Math.round(gross * discountPercent * 100) / 100;
      const total = Math.round((gross - discount) * 100) / 100;

      const statusRoll = rng.next();
      const status: SaleStatus =
        statusRoll < 0.925
          ? "finalizada"
          : statusRoll < 0.955
            ? "cancelada"
            : statusRoll < 0.975
              ? "devolvida"
              : statusRoll < 0.992
                ? "trocada"
                : "parcialmente_devolvida";

      const channel = rng.weighted(CHANNELS, CHANNEL_WEIGHTS);
      const paymentMethod = rng.weighted(PAYMENTS, PAYMENT_WEIGHTS);
      const seller = rng.weighted(demoSellers, SELLER_WEIGHTS);

      // Sorteio de cliente respeitando o perfil de atividade.
      let customerId: string | undefined;
      if (rng.chance(0.74)) {
        const eligible = demoCustomers.filter((c) => {
          if (c.profile === "novo") return offset >= -45;
          if (c.profile === "inativo") return offset < -125;
          return true;
        });
        if (eligible.length > 0) {
          customerId = rng.weighted(
            eligible,
            eligible.map((c) => c.buyWeight)
          ).id;
        }
      }

      sales.push({
        id: `ven_${String(saleIndex).padStart(4, "0")}`,
        companyId: COMPANY_ID,
        unitId: "unit_main",
        code: `#${String(1000 + saleIndex)}`,
        customerId,
        sellerId: seller.id,
        channel,
        paymentMethod,
        installments:
          paymentMethod === "credito"
            ? rng.weighted([1, 2, 3, 4, 6], [0.4, 0.22, 0.2, 0.12, 0.06])
            : paymentMethod === "crediario"
              ? rng.int(2, 4)
              : 1,
        status,
        discount,
        total,
        totalCost,
        date: date.toISOString(),
        items,
      });
    }
  }

  return sales;
}

export const demoSales: Sale[] = buildSales();
