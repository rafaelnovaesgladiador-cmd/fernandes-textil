# Estúdio de imagens

O estúdio é o diferencial do módulo de catálogo. São três recursos, nesta
ordem de uso:

| Recurso | O que a lojista envia | O que recebe |
|---|---|---|
| **Foto de capa** | a foto da peça, tirada como der | a mesma peça com fundo limpo e enquadramento padronizado |
| **Modelo da loja** | uma descrição escrita **ou** uma imagem de referência | a modelo exclusiva da loja, criada uma única vez |
| **Provador** | só a foto da peça | a mesma modelo vestindo aquela peça |

A regra que sustenta o recurso: **a modelo nunca muda entre gerações**. Ela é
uma entidade persistente, presa ao `companyId`, e sua identidade visual fica
travada em `providerRef` — todas as provas derivam desse mesmo identificador.
Trocar a modelo é uma decisão explícita da lojista e limpa as provas antigas
dos produtos, para não misturar duas pessoas na mesma vitrine.

## Arquitetura

```
interface  →  ações de negócio      →  camada de serviço  →  provedor
(telas)       src/lib/store/ai.ts      src/lib/ai/images.ts   (simulado / FASHN)
```

Nenhuma tela conhece o provedor. As telas chamam apenas as ações de negócio;
as ações reservam o crédito, chamam o serviço, guardam o resultado e escrevem
a auditoria. **Não há chamada de rede espalhada pela interface.**

### Camada de serviço — `src/lib/ai/images.ts`

Arquivo único, três funções:

```ts
melhorarImagem({ source, productName, category, color? })      → AiImageResult
criarModelo({ companyId, name, origin, description?, reference? }) → AiImageResult
vestirModelo({ modelRef, garment, productName, category, color? }) → AiImageResult
```

Retorno comum:

```ts
{ ok: true,  image, providerRef, durationMs }
{ ok: false, reason: "provedor" | "conteudo" | "tempo_limite", error }
```

Hoje a implementação é **simulada**: devolve imagens de exemplo depois de um
atraso artificial (1,4 s a 2,6 s) e falha em uma pequena fração das tentativas,
para que os estados de carregando, erro e nova tentativa sejam navegáveis sem
chave de API. A imagem é determinística — a mesma peça gera sempre o mesmo
resultado; só a falha é sorteada por tentativa, senão um produto azarado ficaria
quebrado para sempre.

### Ações de negócio — `src/lib/store/ai.ts`

```ts
enhanceProductPhoto({ productId, source })                  // grava coverImage
createStoreModel({ name, origin, description?, reference? }) // grava storeModel
generateTryOn({ productId, garment? })                       // grava tryOnImage
removeStoreModel()
remainingCredits(state)
grantCredits(amount)
```

Cada uma é uma operação completa, no padrão do resto do sistema: uma chamada
faz a transação inteira, incluindo o registro na auditoria (`activityLog`,
entidade **Estúdio**) e no histórico de gerações (`aiGenerations`).

### Créditos

`AiCreditBalance { companyId, granted, used }` — o mesmo formato que virá do
banco. O crédito é **reservado antes** da chamada, para que duas gerações
simultâneas não gastem o mesmo saldo, e **estornado** se o provedor falhar: só
cobra o que entregou. Com saldo zerado a geração é bloqueada com aviso claro.

Aqui está apenas a mecânica — não há nome nem preço de pacote. Em produção,
`granted` passa a vir do plano contratado.

> Ainda **não há migration** para créditos, modelo e gerações: o estado vive no
> `localStorage`, no formato final. Ver "Ao migrar para o banco".

## Troca para o provedor real (FASHN)

Só `src/lib/ai/images.ts` muda. Mantenha as assinaturas e os tipos de retorno.

1. Guarde a chave em variável de ambiente **de servidor** (sem o prefixo
   `NEXT_PUBLIC_`).
2. Crie um route handler em `src/app/api/estudio/` que chame a FASHN — a chave
   nunca vai para o navegador.
3. No corpo das três funções, troque a simulação pelo `fetch` desse handler:
   - `melhorarImagem` → edição/limpeza de fundo;
   - `criarModelo` → geração de modelo por texto ou imagem; **guarde o
     identificador devolvido em `providerRef`**;
   - `vestirModelo` → try-on, enviando o `providerRef` da modelo mais a peça.
4. Traduza os erros da API para `{ ok: false, reason, error }` com mensagem em
   português — a interface exibe o texto como está.

`isProviderConfigured()` já existe para a interface indicar o modo simulado.

## Ao migrar para o banco

Três tabelas, todas com `company_id` e RLS pelo mesmo padrão das demais
(ver `docs/PRODUCAO.md`):

| Tabela | Origem no estado |
|---|---|
| `store_models` | `state.storeModel` — no máximo uma linha ativa por empresa |
| `ai_generations` | `state.aiGenerations` — histórico, inclusive as falhas |
| `ai_credits` | `state.aiCredits` — `granted` / `used` por empresa |

Em `products`: `source_photo`, `cover_image`, `try_on_image`. As imagens vão
para o Storage; as colunas guardam a URL.
