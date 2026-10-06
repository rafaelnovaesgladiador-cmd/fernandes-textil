# Portal do Cliente — pedidos, entregas e pagamentos

Módulo para acompanhar pedidos de um cliente específico (atacado) e compartilhar
um link com ele. Funciona no celular e atualiza em tempo real dos dois lados.

Para colocar na internet (necessário para o cliente abrir o link), veja [HOSPEDAGEM.md](HOSPEDAGEM.md).

## Como usar

1. Rode o sistema normalmente: `npm install` e `npm start` (porta 3000).
2. Entre com um usuário **admin** ou **gerente** e toque em **🤝 Portal Cliente**
   (ou acesse `/portal`).
3. **Novo cliente** → cadastre nome, contato e WhatsApp.
4. Toque em ⚙ → **Produtos e preços** e cadastre o produto (pode ter mais de um).
5. **Novo pedido** → produto, quantidade, previsão de entrega.
6. Toque em **Enviar** no card "Link de acompanhamento" para mandar o link pelo WhatsApp.

## O que cada lado faz

| Fernandes Têxtil (`/portal`) | Cliente (link `/p/...`, sem senha) |
|---|---|
| Aceita (pode ajustar antes) ou recusa os pedidos solicitados pelo cliente | **Solicita pedidos** escolhendo produto e quantidade; pode cancelar enquanto não forem aceitos |
| Registra pedidos e muda o status (Recebido → Em produção → Pronto → Entregue) | Vê os pedidos, o status e quanto já foi entregue |
| Registra entregas (parciais ou totais) com foto do canhoto/nota | Vê as entregas e os comprovantes |
| Registra pagamentos recebidos com comprovante | Informa um pagamento e envia o comprovante (fica "Aguardando confirmação") |
| Confirma ou recusa os pagamentos informados pelo cliente | Vê o saldo a pagar atualizado |
| Anexa arquivos a pedidos, entregas e pagamentos | Anexa comprovantes a entregas e pagamentos |
| Envia mensagens que aparecem no histórico | Envia mensagens que aparecem no histórico |

- Pedido solicitado pelo cliente fica como **Solicitado** e só entra no saldo depois de aceito.
  O preço vem sempre da tabela de produtos (o cliente não define preço).
- O **histórico** registra tudo com data, hora e autor, e é o mesmo para os dois lados.
- O status muda sozinho para **Entregue parcialmente** / **Entregue** conforme as entregas.
- O saldo considera só pagamentos **confirmados**.
- Ao gerar um **novo link** (⚙ → Gerar novo link), o link antigo para de funcionar.

## Detalhes técnicos

- Backend: `portal.js` (rotas Express + tabelas `portal_*` no mesmo SQLite).
- Telas: `public/portal.html` (gestão) e `public/acompanhar.html` (cliente).
- Tempo real via Server-Sent Events (`/api/portal/eventos` e `/api/p/<token>/eventos`).
- Arquivos ficam em `uploads/portal/` e só são servidos pelo link do próprio cliente.
  Fotos grandes são reduzidas no celular antes do envio. Limite: 15 MB, imagens ou PDF.
- **Faça backup** do `database.db` e da pasta `uploads/`: é onde ficam os dados e os comprovantes.
