"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CustomerForm,
  EMPTY_CUSTOMER,
  formValuesToCustomer,
  type CustomerFormValues,
} from "@/components/clientes/customer-form";
import { createCustomer } from "@/lib/store";

export default function NovoClientePage() {
  const router = useRouter();

  const submit = async (values: CustomerFormValues) => {
    // Pequena espera para o botão mostrar que está trabalhando.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const id = createCustomer(formValuesToCustomer(values));
    toast.success("Cliente cadastrada!", {
      description: `${values.name.trim()} já aparece na lista e nos segmentos.`,
    });
    router.push(`/clientes/${id}`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nova cliente"
        description="O cadastro é o que permite avisar da coleção certa, no tamanho certo, para a pessoa certa."
        actions={
          <Button asChild variant="outline">
            <Link href="/clientes">
              <ArrowLeft /> Voltar para a lista
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados da cliente</CardTitle>
            <CardDescription>
              Só nome e telefone são obrigatórios — o resto pode ser completado
              depois, no perfil dela.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerForm
              defaultValues={EMPTY_CUSTOMER}
              submitLabel="Cadastrar cliente"
              onSubmit={submit}
              onCancel={() => router.push("/clientes")}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="size-4" /> Por que cada campo importa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Telefone: </span>
              é o canal real da loja de moda. Sem ele, a cliente não entra em
              campanha nenhuma.
            </p>
            <p>
              <span className="font-medium text-foreground">Aniversário: </span>
              alimenta o segmento de aniversariantes do mês — motivo natural de
              contato, sem parecer propaganda.
            </p>
            <p>
              <span className="font-medium text-foreground">Tamanho e preferências: </span>
              permitem separar peça certa antes de ela pedir e melhoram a
              conversão do atendimento por WhatsApp.
            </p>
            <p>
              <span className="font-medium text-foreground">Origem: </span>
              mostra o que está trazendo cliente nova (Instagram, indicação,
              vitrine) e onde vale investir.
            </p>
            <p>
              <span className="font-medium text-foreground">Consentimento: </span>
              a LGPD exige autorização para comunicação de marketing. Quem não
              autorizar fica de fora das campanhas automaticamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
