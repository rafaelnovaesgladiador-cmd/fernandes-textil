"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { diffDays } from "@/lib/dates";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { CustomerStats } from "@/lib/metrics";
import { ORIGIN_LABELS } from "./customer-form";

/** Média de dias entre uma compra e a seguinte. */
export function purchaseFrequency(stat: CustomerStats): number | null {
  if (!stat.firstPurchase || !stat.lastPurchase || stat.purchases < 2) return null;
  return Math.round(
    diffDays(stat.lastPurchase, stat.firstPurchase) / (stat.purchases - 1)
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-2.5 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

/** Painel com o que a loja precisa saber antes de falar com a cliente. */
export function CustomerDetails({
  stat,
  sellerName,
}: {
  stat: CustomerStats;
  sellerName?: string;
}) {
  const customer = stat.customer;
  const frequency = purchaseFrequency(stat);
  const preferences = customer.preferences;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ficha da cliente</CardTitle>
        <CardDescription>
          {frequency !== null
            ? `Ela costuma voltar a cada ${formatNumber(frequency)} dias — passou disso, é hora de chamar.`
            : stat.purchases === 1
              ? "Comprou uma única vez: a segunda compra é o que transforma em cliente de casa."
              : "Ainda sem histórico de compras para calcular frequência."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl>
          <Row label="Primeira compra">
            {stat.firstPurchase ? formatDate(stat.firstPurchase) : "—"}
          </Row>
          <Row label="Frequência média">
            {frequency !== null ? `${formatNumber(frequency)} dias` : "—"}
          </Row>
          <Row label="Categoria preferida">
            {stat.favoriteCategory ?? "—"}
          </Row>
          <Row label="Peças compradas">{formatNumber(stat.pieces)}</Row>
          <Row label="Descontos recebidos">
            {stat.discountsReceived > 0 ? (
              <span className="text-serious">
                {formatBRL(stat.discountsReceived)}
              </span>
            ) : (
              "Nenhum"
            )}
          </Row>
          <Row label="Saldo em aberto">
            {stat.openBalance > 0 ? (
              <span className="text-critical">{formatBRL(stat.openBalance)}</span>
            ) : (
              "Sem pendências"
            )}
          </Row>
          <Row label="Vendedora responsável">{sellerName ?? "Sem vendedora fixa"}</Row>
          <Row label="Como conheceu a loja">{ORIGIN_LABELS[customer.origin]}</Row>
          <Row label="Cliente desde">{formatDate(customer.createdAt)}</Row>
          <Row label="Aniversário">{customer.birthday ?? "Não informado"}</Row>
          <Row label="Comunicação (LGPD)">
            {customer.marketingConsent ? (
              <Badge variant="success">Autorizada</Badge>
            ) : (
              <Badge variant="warning">Sem consentimento</Badge>
            )}
          </Row>
        </dl>

        {preferences.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Preferências declaradas
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {preferences.map((preference) => (
                <Badge key={preference} variant="secondary">
                  {preference}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {customer.notes ? (
          <div className="mt-4 rounded-lg bg-secondary/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">Observações</p>
            <p className="mt-1 whitespace-pre-line text-sm">{customer.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
