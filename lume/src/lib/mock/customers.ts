import { createRng } from "@/lib/rng";
import { demoDay } from "@/lib/dates";
import type { Customer, ProductSize } from "@/lib/types";
import { COMPANY_ID, demoSellers } from "./core";

const FIRST_NAMES = [
  "Mariana", "Fernanda", "Patrícia", "Aline", "Beatriz", "Carla", "Daniela",
  "Elaine", "Gabriela", "Helena", "Isabela", "Juliana", "Karina", "Larissa",
  "Michele", "Natália", "Priscila", "Renata", "Sabrina", "Tatiane", "Vanessa",
  "Amanda", "Bruna", "Cristina", "Débora", "Eduarda", "Flávia", "Giovana",
  "Ingrid", "Jéssica", "Luana", "Mônica", "Paula", "Raquel", "Simone",
  "Talita", "Viviane", "Yasmin", "Adriana", "Bianca", "Camile", "Denise",
  "Érica", "Franciele", "Graziela",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Pereira", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho",
  "Gomes", "Martins", "Rocha", "Ribeiro", "Alves", "Monteiro", "Cardoso",
  "Teixeira", "Moreira", "Barbosa", "Campos", "Duarte",
];

const CITIES = ["Campinas", "Valinhos", "Vinhedo", "Hortolândia", "Sumaré", "Paulínia", "Indaiatuba"];
const SIZES: ProductSize[] = ["P", "M", "G", "GG"];
const PREFERENCES = [
  "Vestidos", "Alfaiataria", "Jeans", "Looks para trabalho", "Peças atemporais",
  "Tricô", "Acessórios dourados", "Cores neutras", "Estampas florais", "Linho",
];

/**
 * Perfil de atividade usado pelo gerador de vendas:
 * - "ativo": compra ao longo de todo o histórico;
 * - "novo": só compra nos últimos 45 dias;
 * - "inativo": só compra até 120+ dias atrás (alimenta o alerta de reativação).
 */
export type CustomerProfile = "ativo" | "novo" | "inativo";

export interface DemoCustomer extends Customer {
  profile: CustomerProfile;
  /** Peso de recorrência para o sorteio de vendas. */
  buyWeight: number;
}

function buildCustomers(): DemoCustomer[] {
  const rng = createRng(9042026);
  const customers: DemoCustomer[] = [];
  const usedNames = new Set<string>();

  const TOTAL = 92;
  for (let i = 0; i < TOTAL; i++) {
    let name = "";
    do {
      name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    } while (usedNames.has(name));
    usedNames.add(name);

    const profile: CustomerProfile =
      i < 52 ? "ativo" : i < 65 ? "novo" : "inativo";

    const createdOffset =
      profile === "novo" ? rng.int(-45, -2) : rng.int(-540, -130);

    const phone = `(19) 9${rng.int(6000, 9999)}-${rng.int(1000, 9999)}`;
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, ".")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    customers.push({
      id: `cli_${String(i + 1).padStart(3, "0")}`,
      companyId: COMPANY_ID,
      name,
      phone,
      whatsapp: phone,
      email: rng.chance(0.75) ? `${slug}@gmail.com` : undefined,
      birthday: `${String(rng.int(1, 28)).padStart(2, "0")}/${String(rng.int(1, 12)).padStart(2, "0")}`,
      city: rng.pick(CITIES),
      instagram: rng.chance(0.6) ? `@${slug.replace(".", "_")}` : undefined,
      preferredSize: rng.weighted(SIZES, [0.2, 0.42, 0.26, 0.12]),
      preferences: rng.shuffle(PREFERENCES).slice(0, rng.int(1, 3)),
      sellerId: rng.chance(0.8) ? rng.pick(demoSellers).id : undefined,
      origin: rng.weighted(
        ["loja", "instagram", "whatsapp", "indicacao"] as const,
        [0.45, 0.28, 0.15, 0.12]
      ),
      createdAt: demoDay(createdOffset, rng.int(9, 19)).toISOString(),
      marketingConsent: rng.chance(0.85),
      profile,
      buyWeight:
        profile === "ativo" ? rng.weighted([1, 2, 4, 8], [0.35, 0.3, 0.22, 0.13]) : 2,
    });
  }

  return customers;
}

export const demoCustomers: DemoCustomer[] = buildCustomers();
