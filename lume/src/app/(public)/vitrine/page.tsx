"use client";

import { Storefront } from "@/components/catalogo/storefront";

/**
 * Vitrine pública — o link que a loja compartilha no WhatsApp e no Instagram.
 *
 * A página é só a casca: todo o conteúdo vem do mesmo componente exibido na
 * prévia da administração, então o que o lojista configura é exatamente o que
 * a cliente recebe.
 */
export default function VitrinePage() {
  return <Storefront className="flex-1" />;
}
