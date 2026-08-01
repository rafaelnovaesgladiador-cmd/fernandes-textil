"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus, Store } from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { demoCompany, demoUser } from "@/lib/mock";

/**
 * Seleção de empresa: um usuário pode participar de várias lojas
 * (arquitetura multiempresa). Na demo há a Bella Moda e a opção de
 * criar uma nova loja via onboarding.
 */
export default function SelectCompanyPage() {
  const router = useRouter();
  const { session, ready, selectCompany } = useSession();

  useEffect(() => {
    if (ready && !session.loggedIn) router.replace("/login");
  }, [ready, session, router]);

  const enter = () => {
    selectCompany(demoCompany.id);
    router.push("/visao-geral");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6">
      <Brand className="mb-8" />
      <div className="w-full max-w-md">
        <h1 className="text-center text-xl font-semibold tracking-tight">
          Olá, {demoUser.name.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Escolha a loja que você quer gerenciar agora.
        </p>

        <div className="mt-6 space-y-3">
          <Card className="p-0">
            <button
              onClick={enter}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                {demoCompany.logoInitials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium">{demoCompany.tradeName}</span>
                  <Badge variant="accent">Demonstração</Badge>
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {demoCompany.segment} · {demoCompany.city}/{demoCompany.state} · Proprietário
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>

          <Card className="border-dashed p-0 shadow-none">
            <button
              onClick={() => router.push("/onboarding")}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-secondary rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <Plus className="size-5" />
              </span>
              <span className="flex-1">
                <span className="font-medium">Criar nova loja</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  Configure sua própria loja em poucos minutos
                </span>
              </span>
            </button>
          </Card>
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Store className="size-3.5" />
          Cada loja tem dados totalmente isolados (multiempresa).
        </p>
      </div>
    </div>
  );
}
