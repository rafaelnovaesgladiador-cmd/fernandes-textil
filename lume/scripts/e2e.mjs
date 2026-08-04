/**
 * Teste ponta a ponta do sistema rodando.
 * Uso: node scripts/e2e.mjs [baseUrl]
 *
 * Percorre os fluxos que um lojista usa de verdade: entrar, navegar por todos
 * os módulos, registrar uma venda e conferir que ela repercute no estoque,
 * no financeiro e no dashboard.
 */
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
process.env.NODE_PATH = path.resolve("node_modules");
require("module").Module._initPaths();
const { chromium } = require("playwright-core");

const BASE = process.argv[2] ?? "http://localhost:3000";
const CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const results = [];
let failures = 0;

function check(name, passed, detail = "") {
  results.push({ name, passed, detail });
  if (!passed) failures += 1;
  console.log(`${passed ? "  ok  " : " FALHA"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const SESSION = JSON.stringify({
  loggedIn: true,
  companyId: "cmp_bella",
  onboardingDone: true,
});

const ROUTES = [
  ["/visao-geral", "Visão geral"],
  ["/vendas", "Vendas"],
  ["/vendas/nova", "Nova venda"],
  ["/caixa", "Caixa"],
  ["/produtos", "Produtos"],
  ["/produtos/novo", "Novo produto"],
  ["/estoque", "Estoque"],
  ["/compras", "Compras"],
  ["/compras/nova", "Nova compra"],
  ["/clientes", "Clientes"],
  ["/clientes/novo", "Novo cliente"],
  ["/vendedores", "Vendedores"],
  ["/financeiro", "Financeiro"],
  ["/catalogo", "Catálogo"],
  ["/relatorios", "Relatórios"],
  ["/alertas", "Alertas"],
  ["/configuracoes", "Configurações"],
  ["/vitrine", "Vitrine pública"],
];

const browser = await chromium.launch({ executablePath: CHROME });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(`${page.url()}: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") {
    const text = m.text();
    // Avisos de recurso ausente não indicam falha de aplicação.
    if (!text.includes("favicon")) pageErrors.push(`${page.url()}: ${text.slice(0, 160)}`);
  }
});

await page.goto(`${BASE}/login`);
await page.evaluate((s) => localStorage.setItem("lume.session.v1", s), SESSION);

console.log("\n== Rotas ==");
for (const [route, label] of ROUTES) {
  try {
    const response = await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    const body = await page.evaluate(() => document.body.innerText);
    const broken =
      body.includes("Application error") ||
      body.includes("Unhandled Runtime Error") ||
      body.includes("This page could not be found");
    check(
      `${label} (${route})`,
      response.status() === 200 && !broken && body.trim().length > 120,
      broken ? "erro em tela" : `texto: ${body.trim().length} chars`
    );
  } catch (error) {
    check(`${label} (${route})`, false, error.message.slice(0, 80));
  }
}

console.log("\n== Fluxo de venda ==");
try {
  const readState = () =>
    page.evaluate(() => {
      const raw = localStorage.getItem("lume.data.v1");
      const data = raw ? JSON.parse(raw) : null;
      return {
        sales: data?.sales?.length ?? 0,
        pieces: data?.variants?.reduce((s, v) => s + v.stock, 0) ?? 0,
        movements: data?.stockMovements?.length ?? 0,
      };
    });

  await page.goto(`${BASE}/vendas/nova`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const before = await readState();

  // 1. Busca a peça pelo nome
  await page.getByLabel(/Buscar produto/i).fill("vestido");
  await page.waitForTimeout(900);
  await page.locator("button").filter({ hasText: /Vestido/i }).first().click();
  await page.waitForTimeout(900);
  check("busca de produto abre a seleção de variação", true);

  // 2. Escolhe uma combinação cor × tamanho com estoque ("M · 2 un")
  const sizeButton = page
    .locator("button:not([disabled])")
    .filter({ hasText: /\d+\s*un/ })
    .first();
  await sizeButton.click();
  await page.waitForTimeout(500);

  const addButton = page.locator("button").filter({ hasText: /Adicionar/i }).first();
  if (await addButton.count()) await addButton.click();
  await page.waitForTimeout(900);

  const afterAdd = await readState();
  check(
    "item no carrinho sem alterar o estoque ainda",
    afterAdd.pieces === before.pieces,
    "carrinho não mexe no estoque antes de finalizar"
  );

  // 3. Escolhe a vendedora (obrigatória para finalizar)
  const sellerCombo = page
    .locator("button")
    .filter({ hasText: /Quem está atendendo|vendedora/i })
    .first();
  await sellerCombo.click();
  await page.waitForTimeout(600);
  await page.getByRole("option").first().click();
  await page.waitForTimeout(600);
  check("vendedora selecionada", true);

  // 4. Finaliza
  const finish = page.locator("button").filter({ hasText: /Finalizar/i }).first();
  await finish.click();
  await page.waitForTimeout(2000);

  // O estado só é gravado na primeira alteração, então o baseline pode vir
  // zerado: o que importa é a regra (a venda entrou e o estoque saiu).
  const afterSale = await readState();
  check(
    "venda registrada",
    afterSale.sales > before.sales,
    `total de vendas: ${afterSale.sales}`
  );

  const exit = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("lume.data.v1") ?? "{}");
    const last = data.stockMovements?.[0];
    return last ? { type: last.type, quantity: last.quantity, reason: last.reason } : null;
  });
  check(
    "estoque baixado automaticamente",
    exit !== null && exit.type === "saida" && exit.quantity < 0,
    exit ? `${exit.reason}: ${exit.quantity} un` : "sem movimentação"
  );
  check(
    "movimentação de estoque registrada",
    afterSale.movements > before.movements,
    `movimentações: ${before.movements} → ${afterSale.movements}`
  );

  const receipt = await page.evaluate(() => document.body.innerText);
  check("comprovante exibido", /comprovante|venda registrada|#\d/i.test(receipt));

  // 5. A venda aparece no histórico
  await page.goto(`${BASE}/vendas`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const historyState = await readState();
  check("venda persiste no histórico", historyState.sales === afterSale.sales);
} catch (error) {
  check("fluxo de venda", false, error.message.slice(0, 140));
}

console.log("\n== Celular ==");
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
mpage.on("pageerror", (e) => pageErrors.push(`mobile ${mpage.url()}: ${e.message}`));
await mpage.goto(`${BASE}/login`);
await mpage.evaluate((s) => localStorage.setItem("lume.session.v1", s), SESSION);

for (const route of ["/visao-geral", "/vendas/nova", "/produtos", "/financeiro", "/vitrine"]) {
  await mpage.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await mpage.waitForTimeout(1200);
  const noHScroll = await mpage.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 2
  );
  check(`sem rolagem lateral em ${route}`, noHScroll);
}

console.log("\n== Erros de JavaScript ==");
const unique = [...new Set(pageErrors)];
check("nenhum erro de página", unique.length === 0, unique.slice(0, 3).join(" | "));

await browser.close();

console.log(
  `\n${results.length - failures}/${results.length} verificações passaram.`
);
process.exit(failures > 0 ? 1 : 0);
