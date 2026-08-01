"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Sparkles, TrendingUp, Wallet, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/brand";
import { useSession } from "@/hooks/use-session";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha precisa de ao menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Veja onde sua loja ganha dinheiro",
    text: "Faturamento, lucro e margem lado a lado — sem planilha.",
  },
  {
    icon: PackageSearch,
    title: "Estoque que avisa antes de faltar",
    text: "Reposição sugerida por giro, tamanho e cor.",
  },
  {
    icon: Wallet,
    title: "Financeiro sem sustos",
    text: "Contas a pagar, a receber e previsão de caixa em um lugar só.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "demo@lume.app", password: "demo123" },
  });

  const submit = form.handleSubmit(async () => {
    setSubmitting(true);
    // Autenticação simulada (Etapa 1) — será trocada pelo Supabase Auth.
    await new Promise((resolve) => setTimeout(resolve, 700));
    login();
    toast.success("Bem-vinda de volta!");
    router.push("/selecionar-empresa");
  });

  const exploreDemo = async () => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    login();
    router.push("/selecionar-empresa");
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel institucional (desktop) */}
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <Brand inverse />
        <div className="max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              Sua loja inteira,
              <br />
              em um único lugar.
            </h1>
            <p className="mt-3 text-sidebar-muted-foreground">
              A plataforma que mostra onde sua loja ganha dinheiro, onde perde e
              o que fazer para vender mais.
            </p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <item.icon className="size-4.5" />
                </span>
                <div>
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-sidebar-muted-foreground">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted-foreground">
          Protótipo de demonstração — dados fictícios da loja Bella Moda Feminina.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use as credenciais de demonstração já preenchidas.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline cursor-pointer"
                  onClick={() =>
                    toast.info("Na demonstração a senha já está preenchida 😉")
                  }
                >
                  Esqueci a senha
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={!!form.formState.errors.password}
                  className="pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Entrar
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={submitting}
            onClick={exploreDemo}
          >
            <Sparkles className="text-primary" />
            Explorar com dados de demonstração
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com os termos de uso e a política de
            privacidade (LGPD).
          </p>
        </div>
      </div>
    </div>
  );
}
