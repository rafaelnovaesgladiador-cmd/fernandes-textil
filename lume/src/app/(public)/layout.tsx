import type { Metadata, Viewport } from "next";

/**
 * Área pública: tudo que a cliente final da loja enxerga.
 *
 * Sem AppShell — nada de sidebar, topbar ou navegação do sistema. A página é
 * da loja, não do Lume, e nasce pensada para o celular: é lá que o link do
 * WhatsApp vai ser aberto.
 */

export const metadata: Metadata = {
  title: { absolute: "Catálogo virtual" },
  description:
    "Veja as peças disponíveis, monte sua lista e finalize o pedido pelo WhatsApp.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">{children}</div>
  );
}
