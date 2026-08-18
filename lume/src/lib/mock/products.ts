import { createRng } from "@/lib/rng";
import { demoDay } from "@/lib/dates";
import type { Product, ProductSize, ProductVariant } from "@/lib/types";
import { COMPANY_ID } from "./core";

interface CategorySpec {
  category: string;
  models: string[];
  details: string[];
  count: number;
  costRange: [number, number];
  colors: string[];
  sizes: ProductSize[];
  supplierId: string;
  materials: string[];
}

const CATEGORY_SPECS: CategorySpec[] = [
  {
    category: "Vestidos",
    models: ["Vestido Midi", "Vestido Longo", "Vestido Curto", "Vestido Chemise", "Vestido Tubinho", "Vestido Envelope"],
    details: ["Canelado", "Floral", "de Linho", "de Viscose", "Laise", "Poá", "Liso", "com Fenda"],
    count: 18,
    costRange: [55, 110],
    colors: ["Preto", "Bege", "Vermelho", "Verde Militar", "Azul Marinho", "Off White", "Terracota"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_estilo",
    materials: ["Viscose", "Linho", "Malha canelada", "Algodão laise"],
  },
  {
    category: "Blusas",
    models: ["Blusa Cropped", "Regata", "Blusa Manga Bufante", "Blusa Ciganinha", "Blusa Gola Alta", "Blusa Alcinha"],
    details: ["de Tricô", "Canelada", "de Viscolycra", "de Seda", "com Renda", "Básica", "Muscle Tee", "de Linho"],
    count: 18,
    costRange: [25, 55],
    colors: ["Branco", "Preto", "Rosa Seco", "Caramelo", "Verde Menta", "Azul Claro", "Vinho"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_estilo",
    materials: ["Viscolycra", "Tricô", "Seda sintética", "Algodão"],
  },
  {
    category: "Calças",
    models: ["Calça Wide Leg", "Calça Pantalona", "Calça Skinny", "Calça Mom", "Calça Flare", "Calça Cargo"],
    details: ["Jeans", "de Alfaiataria", "de Linho", "de Sarja", "com Cinto", "Destroyed"],
    count: 14,
    costRange: [55, 95],
    colors: ["Jeans Claro", "Jeans Escuro", "Preto", "Bege", "Off White"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_denim",
    materials: ["Jeans", "Alfaiataria", "Linho misto", "Sarja"],
  },
  {
    category: "Saias",
    models: ["Saia Midi", "Saia Longa", "Saia Curta", "Saia Evasê"],
    details: ["Jeans", "Plissada", "de Linho", "de Couro Eco", "com Botões", "Floral"],
    count: 10,
    costRange: [35, 70],
    colors: ["Preto", "Jeans Médio", "Bege", "Terracota", "Off White"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_estilo",
    materials: ["Jeans", "Couro ecológico", "Linho misto", "Crepe"],
  },
  {
    category: "Shorts",
    models: ["Shorts Mom", "Shorts Alfaiataria", "Shorts Cintura Alta", "Bermuda"],
    details: ["Jeans", "de Linho", "com Cinto", "Barra Dobrada", "de Sarja"],
    count: 8,
    costRange: [30, 55],
    colors: ["Jeans Claro", "Preto", "Bege", "Branco"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_denim",
    materials: ["Jeans", "Linho misto", "Sarja"],
  },
  {
    category: "Conjuntos",
    models: ["Conjunto Alfaiataria", "Conjunto de Tricô", "Conjunto de Linho", "Conjunto Cropped e Saia"],
    details: ["Blazer e Calça", "Colete e Calça", "Cardigan e Saia", "Premium", "Casual"],
    count: 8,
    costRange: [70, 120],
    colors: ["Bege", "Preto", "Rosa Seco", "Verde Militar", "Off White"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_alfaiataria",
    materials: ["Alfaiataria", "Tricô", "Linho misto"],
  },
  {
    category: "Macacões",
    models: ["Macacão Pantacourt", "Macacão Longo", "Macaquinho"],
    details: ["de Linho", "de Viscose", "Alfaiataria", "com Amarração", "Jeans"],
    count: 6,
    costRange: [60, 100],
    colors: ["Preto", "Bege", "Verde Militar", "Azul Marinho"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_alfaiataria",
    materials: ["Linho misto", "Viscose", "Jeans"],
  },
  {
    category: "Casacos",
    models: ["Blazer", "Jaqueta Jeans", "Cardigan", "Trench Coat", "Casaco de Tricô"],
    details: ["Oversized", "Alfaiataria", "com Botões Dourados", "Longo", "Cropped", "Clássico"],
    count: 10,
    costRange: [70, 140],
    colors: ["Preto", "Bege", "Caramelo", "Jeans Médio", "Cinza"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_trico",
    materials: ["Tricô", "Alfaiataria", "Jeans", "Lã sintética"],
  },
  {
    category: "Camisas",
    models: ["Camisa", "Camisa Oversized", "Camisete"],
    details: ["Branca Clássica", "de Linho", "Listrada", "Jeans", "de Viscose", "de Tricoline"],
    count: 10,
    costRange: [40, 75],
    colors: ["Branco", "Azul Claro", "Listrado", "Bege", "Preto"],
    sizes: ["P", "M", "G", "GG"],
    supplierId: "sup_denim",
    materials: ["Tricoline", "Linho misto", "Viscose"],
  },
  {
    category: "Acessórios",
    models: ["Cinto", "Bolsa", "Lenço", "Brinco", "Colar", "Óculos de Sol", "Chapéu"],
    details: ["de Couro Eco", "Tiracolo", "de Seda", "Argola Dourada", "Corrente Fina", "Gatinho", "Bucket", "Estruturada", "Palha"],
    count: 18,
    costRange: [12, 60],
    colors: ["Dourado", "Preto", "Caramelo", "Bege", "Prata"],
    sizes: ["U"],
    supplierId: "sup_acessorios",
    materials: ["Couro ecológico", "Metal dourado", "Palha natural", "Seda sintética"],
  },
];

const COLLECTIONS = ["Verão 2026", "Outono 2026", "Inverno 2026", "Atemporal"];
const BRANDS = ["Bella Basics", "Rue Blanc", "Flor de Lis", "Amaro Sul", "Vila Musa"];
const LOCATIONS = ["Arara A1", "Arara A2", "Arara B1", "Arara B2", "Prateleira C1", "Prateleira C2", "Vitrine", "Estoque fundo"];

function roundPrice(value: number): number {
  return Math.max(29.9, Math.round(value / 10) * 10 - 0.1);
}

function buildCatalog() {
  const rng = createRng(20260801);
  const products: Product[] = [];
  const variants: ProductVariant[] = [];
  let productIndex = 0;
  let variantIndex = 0;

  for (const spec of CATEGORY_SPECS) {
    const combos: string[] = [];
    for (const model of spec.models) {
      for (const detail of spec.details) {
        combos.push(`${model} ${detail}`);
      }
    }
    const names = rng.shuffle(combos).slice(0, spec.count);

    for (const name of names) {
      productIndex += 1;
      const id = `prd_${String(productIndex).padStart(3, "0")}`;
      const cost = Math.round(rng.float(spec.costRange[0], spec.costRange[1]));
      const markup = rng.float(2.2, 2.7);
      const price = roundPrice(cost * markup);

      // Perfil de giro: ~14% dos produtos ficam "parados" (peso 0),
      // ~20% viram alto giro (peso 7–10), o restante gira moderado.
      const giroRoll = rng.next();
      const demandWeight =
        giroRoll < 0.14 ? 0 : giroRoll < 0.34 ? rng.int(7, 10) : rng.int(2, 6);

      const isPromo = demandWeight === 0 && rng.chance(0.35);
      const entryOffset =
        demandWeight === 0 ? rng.int(-320, -130) : rng.int(-160, -12);

      const product: Product = {
        id,
        companyId: COMPANY_ID,
        name,
        description: `${name} — coleção ${rng.pick(COLLECTIONS)}. Modelagem confortável, caimento premium.`,
        category: spec.category,
        collection: rng.pick(COLLECTIONS),
        brand: rng.pick(BRANDS),
        supplierId: spec.supplierId,
        material: rng.pick(spec.materials),
        cost,
        price,
        promoPrice: isPromo ? roundPrice(price * 0.7) : undefined,
        sku: `BM-${spec.category.slice(0, 3).toUpperCase()}-${String(productIndex).padStart(3, "0")}`,
        barcode: `789${String(100000000 + productIndex * 137).slice(0, 9)}${productIndex % 10}`,
        status: "ativo",
        entryDate: demoDay(entryOffset).toISOString(),
        stockLocation: rng.pick(LOCATIONS),
        minStock: spec.sizes.length > 1 ? 2 : 3,
        demandWeight,
      };
      products.push(product);

      const colorCount =
        spec.sizes.length === 1
          ? rng.int(1, 3)
          : rng.weighted([1, 2, 3], [0.45, 0.4, 0.15]);
      const colors = rng.shuffle(spec.colors).slice(0, colorCount);
      for (const color of colors) {
        for (const size of spec.sizes) {
          variantIndex += 1;
          // Estoque: produtos parados acumulam peças; alto giro roda baixo
          // (alguns abaixo do mínimo, para alimentar o alerta de reposição).
          const stock =
            demandWeight === 0
              ? rng.int(1, 5)
              : demandWeight >= 7
                ? rng.int(0, 3)
                : rng.int(0, 5);
          variants.push({
            id: `var_${String(variantIndex).padStart(4, "0")}`,
            companyId: COMPANY_ID,
            productId: id,
            color,
            size,
            sku: `${product.sku}-${color.slice(0, 2).toUpperCase()}-${size}`,
            barcode: `790${String(200000000 + variantIndex * 91).slice(0, 9)}${variantIndex % 10}`,
            stock,
            minStock: product.minStock,
          });
        }
      }
    }
  }

  return { products, variants };
}

const catalog = buildCatalog();

export const demoProducts: Product[] = catalog.products;
export const demoVariants: ProductVariant[] = catalog.variants;

export const variantsByProduct = new Map<string, ProductVariant[]>();
for (const variant of demoVariants) {
  const list = variantsByProduct.get(variant.productId) ?? [];
  list.push(variant);
  variantsByProduct.set(variant.productId, list);
}
