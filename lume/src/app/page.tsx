"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";
import { Brand } from "@/components/brand";

/** Raiz: direciona conforme o estado da sessão simulada. */
export default function Home() {
  const router = useRouter();
  const { session, ready } = useSession();

  useEffect(() => {
    if (!ready) return;
    if (!session.loggedIn) router.replace("/login");
    else if (!session.companyId) router.replace("/selecionar-empresa");
    else router.replace("/visao-geral");
  }, [ready, session, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Brand size="lg" className="animate-pulse" />
    </div>
  );
}
