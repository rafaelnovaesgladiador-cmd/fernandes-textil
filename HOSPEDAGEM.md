# Colocar o sistema na internet

Para o cliente abrir o link de acompanhamento no celular, o sistema precisa
estar hospedado. O projeto já vem pronto para isso (`Dockerfile`, `railway.json`
e `render.yaml`).

> **Importante:** o sistema guarda o banco de dados e os comprovantes em disco.
> Use sempre uma hospedagem com **disco/volume persistente** montado em `/data`.
> Sem isso, tudo é apagado a cada atualização.

## Opção recomendada: Railway

Custo aproximado: plano Hobby, cerca de US$ 5/mês (confira o preço atual no site).

1. Crie uma conta em <https://railway.com> entrando com o GitHub.
2. **New Project → Deploy from GitHub repo** e escolha `fernandes-textil`.
   - Se o código ainda estiver só no branch `claude/order-payment-tracking-system-iuxqlf`,
     faça o merge para `main` antes, ou escolha esse branch em
     **Settings → Source → Branch**.
3. No serviço criado, abra **Variables** e adicione:
   - `ADMIN_SENHA` = uma senha forte para o usuário `admin`
4. Clique com o botão direito no serviço → **Attach volume** e use
   **Mount path:** `/data`.
5. Em **Settings → Networking**, clique em **Generate Domain**. O endereço
   gerado (ex.: `fernandes-textil.up.railway.app`) é o do seu sistema.
6. Acesse `https://SEU-ENDERECO/portal`, entre com `admin` e a senha do passo 3,
   cadastre o cliente e envie o link para ele.

A cada `git push` no branch escolhido, o Railway publica a nova versão
sozinho, mantendo os dados do volume.

## Alternativa: Render

Custo aproximado: plano Starter (~US$ 7/mês) + disco (centavos por GB).
O plano gratuito **não** serve, porque não tem disco persistente.

1. Crie uma conta em <https://render.com> com o GitHub.
2. **New + → Blueprint** e escolha o repositório. O `render.yaml` já configura
   o serviço, o disco em `/data` e a chave secreta.
3. Informe o valor de `ADMIN_SENHA` quando for pedido e confirme.
4. Use o endereço `https://….onrender.com/portal`.

## Outras opções (VPS, Fly.io etc.)

Qualquer servidor com Docker funciona:

```bash
docker build -t fernandes-textil .
docker run -d --name fernandes-textil --restart unless-stopped \
  -p 80:3000 -e ADMIN_SENHA='sua-senha-forte' -v fernandes-dados:/data fernandes-textil
```

Para ter `https://`, coloque um proxy na frente (Caddy, Nginx ou Cloudflare).

## Variáveis de ambiente

| Variável | Para que serve | Padrão |
|---|---|---|
| `ADMIN_SENHA` | Senha inicial do `admin` (usada só na primeira vez que o banco é criado) | Se vazia, uma senha aleatória aparece no log |
| `DATA_DIR` | Pasta do banco e dos comprovantes | `/data` no Docker |
| `JWT_SECRET` | Chave do login | Gerada sozinha e salva em `/data` |
| `PORT` | Porta HTTP | Definida pela hospedagem |

## Segurança em produção

- As senhas padrão do código **não** valem na hospedagem: o `admin` usa
  `ADMIN_SENHA`, e os usuários `atendente` e `entregador` ficam **desativados**
  até você definir uma senha para eles em **Usuários**.
- Mudar `ADMIN_SENHA` depois não altera a senha: troque em **Usuários** no sistema.
- O endereço `/saude` serve para a hospedagem saber se o sistema está no ar.

## Backup

Os dados ficam todos no volume `/data` (`database.db` e a pasta `uploads/`).
No Railway e no Render dá para criar backups/snapshots do volume. Faça um
pelo menos uma vez por semana.
