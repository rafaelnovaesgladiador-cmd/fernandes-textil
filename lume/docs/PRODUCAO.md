# Preparação para produção

O protótipo funciona inteiramente no navegador: o estado vive em
`src/lib/store` e é persistido no `localStorage`. Este documento descreve o
que muda para colocar o Lume em produção com banco real, autenticação e
isolamento entre lojas.

## 1. Banco de dados

As migrações em `supabase/migrations/` criam o esquema completo:

| Arquivo | Conteúdo |
|---|---|
| `0001_schema.sql` | tabelas, tipos, restrições e índices |
| `0002_rls.sql` | Row Level Security, permissões por perfil e catálogo público |

Aplicar com a CLI do Supabase:

```bash
supabase link --project-ref <ref-do-projeto>
supabase db push
```

### Isolamento entre empresas

Toda tabela de negócio tem `company_id`, e o RLS filtra por
`auth_company_ids()` — as empresas a que o usuário autenticado pertence via
`company_users`. **O isolamento vive no banco, não na aplicação**: uma consulta
que esqueça o filtro simplesmente não retorna linhas de outra loja.

Funções auxiliares (`SECURITY DEFINER` com `search_path` fixo):

- `auth_company_ids()` — empresas do usuário atual
- `has_company_role(company, roles[])` — checagem de perfil
- `is_company_manager(company)` — atalho para proprietário/gerente

### Perfis e escrita

As políticas de escrita seguem a matriz de `src/lib/permissions.ts`:

| Perfil | Escreve em |
|---|---|
| Proprietário | tudo, incluindo equipe |
| Gerente | tudo, exceto gestão de usuários |
| Vendedor | vendas, clientes, interações |
| Operador de caixa | vendas, caixa, recebimentos, clientes |
| Estoquista | produtos, variações, estoque, compras |
| Financeiro | despesas, contas a pagar e receber, compras |

O front esconde o que o perfil não pode usar (experiência); o banco recusa a
operação (garantia).

## 2. Autenticação

Trocar `src/hooks/use-session.ts` pelo Supabase Auth, mantendo a mesma
interface (`session`, `ready`, `login`, `selectCompany`, `logout`) — nenhuma
tela precisa mudar.

Fluxo esperado:

1. Login por e-mail/senha ou magic link
2. Buscar `company_users` do usuário
3. Se houver mais de uma loja, manter a tela de seleção de empresa
4. Guardar a empresa ativa na sessão e usá-la em todas as consultas

## 3. Dados

`src/lib/store/store.ts` é o único ponto que precisa trocar de origem: hoje lê
e grava no `localStorage`; em produção passa a consultar as tabelas. As ações
de `src/lib/store/actions.ts` já são transacionais por natureza — cada uma
descreve uma operação de negócio completa (uma venda baixa estoque, registra
movimentação, gera recebíveis e grava auditoria).

Recomendação: mover as ações compostas para funções `plpgsql` ou Edge
Functions, para que a transação aconteça no banco. Exemplo:

```sql
create function registrar_venda(payload jsonb) returns uuid ...
```

Assim uma queda de conexão no meio da operação não deixa estoque baixado sem
venda registrada.

## 4. Configuração

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon>
```

`src/lib/supabase/client.ts` detecta as variáveis e expõe
`isSupabaseConfigured()`. A chave `service_role` **nunca** vai para o cliente.

## 5. Auditoria e LGPD

- `activity_log` guarda usuário, empresa, ação, entidade, valor anterior, valor
  novo, IP e data. A política permite inserir e ler, nunca alterar ou apagar.
- Exclusão lógica: as tabelas de cadastro têm `deleted_at` — nada é removido
  fisicamente, o que preserva o histórico de vendas.
- Consentimento: `customers.marketing_consent` e `consent_at` registram a
  autorização para comunicações.
- Exportação e anonimização de dados de clientes devem ser expostas como ações
  administrativas (direito de acesso e de eliminação).

## 6. Catálogo público

A vitrine é aberta a quem tem o link. O acesso anônimo é limitado à view
`catalog_products`, que expõe apenas nome, categoria, preço e disponibilidade
dos produtos de catálogos publicados — **sem custo, margem, fornecedor ou
qualquer dado de cliente**. A publicação é controlada por
`public_catalogs.is_published`.

## 7. Ordem sugerida de implantação

1. Aplicar as migrações e conferir as políticas com o SQL Editor (tente ler
   dados de outra empresa e confirme que retorna vazio)
2. Ativar o Supabase Auth e migrar `use-session`
3. Migrar leitura (store lendo das tabelas), mantendo escrita local
4. Migrar escrita, movendo as ações compostas para funções no banco
5. Publicar o catálogo e configurar o domínio
6. Ativar cobrança de planos (`companies.plan`)
