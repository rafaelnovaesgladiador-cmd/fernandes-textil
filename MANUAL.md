# Fernandes Têxtil — controle da operação

Sistema para uma operação com **um fornecedor → Fernandes Têxtil → um cliente**.
Funciona no computador e no celular, com atualização em tempo real.

- **Você (admin):** `https://seu-endereco/` → login `admin`
- **Cliente:** link `https://seu-endereco/p/...` (sem senha), enviado por você

Para colocar na internet, veja [HOSPEDAGEM.md](HOSPEDAGEM.md).

## Primeiros passos

1. Entre com `admin` / `admin123` e crie a sua senha.
2. **Ajustes → Cliente:** nome, contato e WhatsApp.
3. **Ajustes → Fornecedor:** nome e contato (só você vê).
4. **Ajustes → Produtos e cores:** cadastre os modelos com **preço de venda**,
   **custo do fornecedor** e as **cores** (toque nas cores prontas ou crie outras).
5. Se já tiver mercadoria parada, use **Estoque → lápis** em cada cor para informar a contagem inicial.
6. **Ajustes → Link de acompanhamento** para enviar o link ao cliente pelo WhatsApp.

## Como a operação funciona

| Etapa | Onde | O que acontece |
|---|---|---|
| Cliente monta o pedido | Link do cliente → **Fazer pedido** | Escolhe o produto, toca na cor, digita a quantidade e adiciona ao cesto. Ao trocar de cor a quantidade zera. No fim revisa o cesto e envia. |
| Você aprova | **Pedidos → Para aprovar** | Aceitar, ajustar (quantidade/preço/prazo) ou recusar com motivo. Antes de aceito, não entra no saldo. |
| Mercadoria chega do fornecedor | **Estoque → Nova entrada** | Lança cor por cor com o custo. **Soma no estoque** e no valor **a pagar**. Anexe a nota. |
| Envio ao cliente | Pedido → **Registrar envio** | Informa quanto de cada cor saiu. **Baixa do estoque**; o status muda sozinho para Entregue parcialmente / Entregue. Anexe o canhoto. |
| Cliente paga | Link → **Pagamentos → Informar pagamento** | Fica "Aguardando confirmação" até você confirmar em **Financeiro → Cliente**. |
| Você paga o fornecedor | **Financeiro → Fornecedor** | Abate do valor a pagar. Anexe o comprovante. |
| Você retira a comissão | **Financeiro → Comissão** | Registra a retirada. Anexe o comprovante se quiser. |

## Painel (Início)

- **A entregar:** peças dos pedidos aceitos que ainda não foram enviadas.
- **A receber do cliente:** pedidos aceitos − pagamentos confirmados.
- **A pagar ao fornecedor:** entradas lançadas − pagamentos ao fornecedor.
- **Comissão disponível:** (preço de venda − custo) dos pedidos aceitos − retiradas.
- **Em caixa:** recebido − pago ao fornecedor − retiradas.
- **Estoque por cor** e **falta comprar** (quanto falta em estoque para atender os pedidos).

## O que o cliente vê e o que não vê

O cliente vê: produtos ativos (foto, preço de venda, cores), os pedidos dele com o que foi
entregue por cor, os envios com comprovantes, os pagamentos e o histórico.

O cliente **não** vê: custo, comissão, fornecedor, estoque, entradas, pagamentos ao fornecedor,
retiradas. Na tela **Atividade**, esses itens aparecem com cadeado ("só você vê").

## Detalhes técnicos

- `server.js` (login e configuração) e `operacao.js` (regras da operação), SQLite.
- Telas em `public/`: `index.html` + `app.js` (admin), `cliente.html` + `cliente.js` (cliente),
  `comum.js` e `estilo.css` (compartilhados).
- Estoque calculado: entradas − envios + ajustes, por produto e cor.
- Tempo real por Server-Sent Events, com atualização a cada 15 s se a conexão cair.
