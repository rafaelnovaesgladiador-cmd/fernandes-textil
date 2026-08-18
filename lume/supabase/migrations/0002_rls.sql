-- =============================================================================
-- Lume — Row Level Security
--
-- Regra central: um usuário só enxerga linhas das empresas às quais pertence
-- (tabela company_users). O isolamento vive no banco, não na aplicação — mesmo
-- que uma consulta do cliente esqueça o filtro, o Postgres não devolve dados
-- de outra loja.
-- =============================================================================

-- Funções auxiliares ----------------------------------------------------------

-- SECURITY DEFINER porque a própria política de company_users usaria esta
-- função, o que criaria recursão. O search_path fixo evita sequestro de schema.
create or replace function auth_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from company_users where user_id = auth.uid();
$$;

create or replace function has_company_role(target_company uuid, allowed user_role[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from company_users
    where user_id = auth.uid()
      and company_id = target_company
      and role = any(allowed)
  );
$$;

-- Perfis com poder de escrita ampla; usados nas políticas mais restritivas.
create or replace function is_company_manager(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select has_company_role(target_company, array['proprietario','gerente']::user_role[]);
$$;

-- Habilita RLS ----------------------------------------------------------------

alter table companies              enable row level security;
alter table units                  enable row level security;
alter table company_users          enable row level security;
alter table company_settings       enable row level security;
alter table suppliers              enable row level security;
alter table sellers                enable row level security;
alter table customers              enable row level security;
alter table products               enable row level security;
alter table product_variants       enable row level security;
alter table sales                  enable row level security;
alter table sale_items             enable row level security;
alter table stock_movements        enable row level security;
alter table purchases              enable row level security;
alter table purchase_items         enable row level security;
alter table cash_sessions          enable row level security;
alter table cash_movements         enable row level security;
alter table expenses               enable row level security;
alter table payables               enable row level security;
alter table receivables            enable row level security;
alter table goals                  enable row level security;
alter table campaigns              enable row level security;
alter table customer_interactions  enable row level security;
alter table alert_states           enable row level security;
alter table activity_log           enable row level security;

-- Empresa e acesso ------------------------------------------------------------

create policy companies_select on companies
  for select using (id in (select auth_company_ids()));

create policy companies_update on companies
  for update using (is_company_manager(id)) with check (is_company_manager(id));

create policy company_users_select on company_users
  for select using (company_id in (select auth_company_ids()));

-- Só proprietário e gerente administram a equipe.
create policy company_users_write on company_users
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create policy company_settings_select on company_settings
  for select using (company_id in (select auth_company_ids()));

create policy company_settings_write on company_settings
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create policy units_select on units
  for select using (company_id in (select auth_company_ids()));

create policy units_write on units
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

-- Tabelas de operação ---------------------------------------------------------
-- Leitura para qualquer membro da empresa; escrita conforme o perfil.

do $$
declare
  t text;
begin
  foreach t in array array[
    'suppliers','sellers','customers','products','product_variants',
    'sales','sale_items','stock_movements','purchases','purchase_items',
    'cash_sessions','cash_movements','expenses','payables','receivables',
    'goals','campaigns','customer_interactions','alert_states'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (company_id in (select auth_company_ids()));
    $f$, t);
  end loop;
end $$;

-- Escrita por perfil ----------------------------------------------------------

-- Estoquistas e gestores mexem em catálogo e estoque.
create policy products_write on products
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista']::user_role[])
  );

create policy product_variants_write on product_variants
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista']::user_role[])
  );

-- A venda também movimenta estoque, então vendedor e caixa inserem movimentações.
create policy stock_movements_write on stock_movements
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista','vendedor','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista','vendedor','caixa']::user_role[])
  );

create policy sales_write on sales
  for all using (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  );

create policy sale_items_write on sale_items
  for all using (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  );

create policy customers_write on customers
  for all using (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','vendedor','caixa']::user_role[])
  );

create policy customer_interactions_write on customer_interactions
  for all using (
    has_company_role(company_id, array['proprietario','gerente','vendedor']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','vendedor']::user_role[])
  );

create policy campaigns_write on campaigns
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create policy suppliers_write on suppliers
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  );

create policy purchases_write on purchases
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  );

create policy purchase_items_write on purchase_items
  for all using (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','estoquista','financeiro']::user_role[])
  );

-- Caixa: operador de caixa opera; gestores acompanham.
create policy cash_sessions_write on cash_sessions
  for all using (
    has_company_role(company_id, array['proprietario','gerente','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','caixa']::user_role[])
  );

create policy cash_movements_write on cash_movements
  for all using (
    has_company_role(company_id, array['proprietario','gerente','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','caixa']::user_role[])
  );

-- Financeiro: restrito a quem cuida do dinheiro.
create policy expenses_write on expenses
  for all using (
    has_company_role(company_id, array['proprietario','gerente','financeiro']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','financeiro']::user_role[])
  );

create policy payables_write on payables
  for all using (
    has_company_role(company_id, array['proprietario','gerente','financeiro']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','financeiro']::user_role[])
  );

create policy receivables_write on receivables
  for all using (
    has_company_role(company_id, array['proprietario','gerente','financeiro','caixa']::user_role[])
  ) with check (
    has_company_role(company_id, array['proprietario','gerente','financeiro','caixa']::user_role[])
  );

create policy sellers_write on sellers
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create policy goals_write on goals
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create policy alert_states_write on alert_states
  for all using (company_id in (select auth_company_ids()))
  with check (company_id in (select auth_company_ids()));

-- Auditoria: qualquer membro registra; ninguém altera nem apaga.
create policy activity_log_select on activity_log
  for select using (company_id in (select auth_company_ids()));

create policy activity_log_insert on activity_log
  for insert with check (company_id in (select auth_company_ids()));

-- =============================================================================
-- Catálogo público
--
-- A vitrine é aberta a quem recebe o link, então precisa de leitura anônima —
-- mas apenas do que é público. Uma view expõe só as colunas necessárias, sem
-- custo, margem, fornecedor ou qualquer dado de cliente.
-- =============================================================================

create table public_catalogs (
  company_id uuid primary key references companies(id) on delete cascade,
  slug text not null unique,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public_catalogs enable row level security;

create policy public_catalogs_select on public_catalogs
  for select using (is_published or company_id in (select auth_company_ids()));

create policy public_catalogs_write on public_catalogs
  for all using (is_company_manager(company_id))
  with check (is_company_manager(company_id));

create or replace view catalog_products
with (security_invoker = true)
as
select
  p.company_id,
  c.slug,
  p.id,
  p.name,
  p.description,
  p.category,
  p.collection,
  p.material,
  p.price,
  p.promo_price,
  coalesce(sum(v.stock), 0) as stock
from products p
join public_catalogs c on c.company_id = p.company_id and c.is_published
left join product_variants v on v.product_id = p.id
where p.status = 'ativo' and p.deleted_at is null
group by p.company_id, c.slug, p.id
having coalesce(sum(v.stock), 0) > 0;

grant select on catalog_products to anon;
