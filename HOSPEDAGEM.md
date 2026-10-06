# Colocar o sistema na internet

Para o cliente abrir o link de acompanhamento no celular, o sistema precisa
estar hospedado. O projeto já vem pronto para isso (`Dockerfile`, `railway.json`
e `render.yaml`).

> **Importante:** o sistema guarda o banco de dados e os comprovantes em disco.
> Na Hostinger isso já funciona sozinho (veja abaixo). No Railway, no Render e
> com Docker, crie um **volume/disco persistente** montado em `/data`; sem ele,
> tudo é apagado a cada atualização.

## Hostinger (Aplicativo Web Node.js)

Funciona nos planos **Business Web Hosting** e **Cloud** (Startup, Professional,
Enterprise). Os planos Single e Premium **não** rodam Node.js. Nesses casos,
faça upgrade ou use uma VPS da Hostinger (veja "Outras opções").

1. No hPanel: **Sites → Adicionar site → Aplicativo Web Node.js**
   (o nome exato pode variar um pouco).
2. Escolha **Importar do GitHub**, autorize sua conta e selecione o repositório
   `fernandes-textil` e o branch (`main`, ou `claude/order-payment-tracking-system-iuxqlf`
   se ainda não tiver feito o merge).
   - Alternativa: **enviar arquivo ZIP** do projeto (sem a pasta `node_modules`).
3. Configurações de build:
   - **Framework:** Express.js (ou "Outro")
   - **Versão do Node.js:** 22.x (20.x e 24.x também funcionam)
   - **Arquivo de entrada:** `server.js`
   - **Comando de início:** `npm start` (build: deixe o padrão / `npm install`)
4. **Variáveis de ambiente**, antes de publicar:
   - `NODE_ENV` = `production`
   - `ADMIN_SENHA` = uma senha forte para o usuário `admin`
5. Publique (Deploy) e conecte um domínio ou subdomínio
   (ex.: `pedidos.seudominio.com.br`). O SSL/https é ativado no próprio hPanel.
6. Acesse `https://pedidos.seudominio.com.br/portal` e entre com `admin` e a
   senha do passo 4.

Onde ficam os dados na Hostinger: na pasta `fernandes-textil-dados`, dentro da
pasta principal da sua conta (fora da pasta do app). Assim eles não são apagados
quando você publica uma nova versão. Para backup, baixe essa pasta pelo
**Gerenciador de Arquivos** de vez em quando.

> Se a hospedagem segurar a conexão de "tempo real", o sistema percebe e passa a
> atualizar as telas sozinho a cada 15 segundos. O indicador mostra "Reconectando"
> em vez de "Ao vivo", mas tudo continua funcionando.

## Railway

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
| `NODE_ENV` | Use `production` na hospedagem (ativa as proteções abaixo) | já vem no Docker |
| `DATA_DIR` | Pasta do banco e dos comprovantes | `/data` no Docker; `~/fernandes-textil-dados` nos demais |
| `JWT_SECRET` | Chave do login | Gerada sozinha e salva na pasta de dados |
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
