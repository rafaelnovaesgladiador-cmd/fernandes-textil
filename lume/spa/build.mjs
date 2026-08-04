import { build } from "esbuild";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const spaDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(spaDir, "..");
const outDir = resolve(spaDir, ".out");

/**
 * Empacota o Lume em um único HTML autossuficiente (sem requisições externas),
 * para demonstração em qualquer navegador. Reaproveita o mesmo código-fonte do
 * app Next: os módulos "next/link" e "next/navigation" são redirecionados para
 * os shims de roteamento por hash em spa/next-shims.
 */

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

// 1. CSS — Tailwind v4 varre os componentes e emite só o que é usado.
const cssPath = resolve(outDir, "app.css");
await run(
  "npx",
  ["--yes", "@tailwindcss/cli", "-i", resolve(spaDir, "spa.css"), "-o", cssPath, "--minify"],
  { cwd: projectDir }
);
const css = await readFile(cssPath, "utf8");

// 1b. Fonte Geist embutida (subconjunto latino, que cobre todo o português),
// extraída do build do Next para manter a tipografia idêntica à do app.
const fontFile = resolve(
  projectDir,
  ".next/static/media/caa3a2e1cccd8315-s.p.0wgildi0cnwt9.woff2"
);
let fontFace = "";
try {
  const fontData = await readFile(fontFile);
  fontFace =
    `@font-face{font-family:Geist;font-style:normal;font-weight:100 900;` +
    `font-display:swap;src:url(data:font/woff2;base64,${fontData.toString("base64")}) format("woff2")}` +
    `:root{--font-geist-sans:Geist}`;
  console.log(`FONT  ${Math.round(fontData.length / 1024)} KB (Geist latin)`);
} catch {
  console.warn("AVISO: fonte Geist não encontrada — usando a stack do sistema.");
}

// 2. JS — bundle único, com os módulos do Next resolvidos para os shims.
const nextShimPlugin = {
  name: "next-shims",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^next\/link$/ }, () => ({
      path: resolve(spaDir, "next-shims/link.tsx"),
    }));
    pluginBuild.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: resolve(spaDir, "next-shims/navigation.ts"),
    }));
    // O CSS é gerado pelo Tailwind na etapa 1; aqui o import vira no-op.
    pluginBuild.onResolve({ filter: /\.css$/ }, (args) => ({
      path: args.path,
      namespace: "css-stub",
    }));
    pluginBuild.onLoad({ filter: /.*/, namespace: "css-stub" }, () => ({
      contents: "",
      loader: "js",
    }));
  },
};

const result = await build({
  entryPoints: [resolve(spaDir, "main.tsx")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  jsx: "automatic",
  platform: "browser",
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".svg": "dataurl", ".png": "dataurl" },
  alias: { "@": resolve(projectDir, "src") },
  plugins: [nextShimPlugin],
  write: false,
});

const js = result.outputFiles[0].text;

// 3. Saídas — CSS e JS embutidos; a página não faz nenhuma requisição externa.

// Estilos que normalmente viriam das classes em <html>/<body> do layout Next.
// Aqui vão no CSS para que a página funcione também quando o host fornece o
// próprio esqueleto HTML (caso da publicação como página hospedada).
const shellCss = `html,body{min-height:100%}body{margin:0}`;

const head = `<title>Lume — Gestão para lojas de moda</title>
<meta name="description" content="Plataforma que mostra onde sua loja ganha dinheiro, onde perde e o que fazer para vender mais." />
<style>${fontFace}${shellCss}${css}</style>`;
const bodyContent = `<div id="root"></div>
<script>${js}</script>`;

// 3a. Arquivo autossuficiente: abre com duplo clique ou em qualquer hospedagem.
const standalone = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    ${head}
  </head>
  <body>
    ${bodyContent}
  </body>
</html>
`;
const standalonePath = resolve(outDir, "lume-demo.html");
await writeFile(standalonePath, standalone, "utf8");

// 3b. Fragmento para hosts que já entregam <html>/<head>/<body>.
const fragmentPath = resolve(outDir, "lume-artifact.html");
await writeFile(fragmentPath, `${head}\n${bodyContent}\n`, "utf8");

const kb = (value) => `${Math.round(value / 1024)} KB`;
console.log(`CSS   ${kb(css.length)}`);
console.log(`JS    ${kb(js.length)}`);
console.log(`HTML  ${kb(standalone.length)}`);
console.log(`  →  ${standalonePath}  (abrir direto no navegador)`);
console.log(`  →  ${fragmentPath}  (publicação hospedada)`);
