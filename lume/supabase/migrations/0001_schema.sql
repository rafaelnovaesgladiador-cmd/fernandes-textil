-- =============================================================================
-- Lume — esquema base (multiempresa)
--
-- Toda tabela de negócio carrega company_id: é a chave de isolamento entre
-- lojas, aplicada por RLS em 0002_rls.sql. Os tipos espelham src/lib/types.ts.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Tipos -----------------------------------------------------------------------

create type user_role as enum (
  'proprietario', 'gerente', 'vendedor', 'caixa', 'estoquista', 'financeiro'
);
create type sales_channel as enum ('loja', 'whatsapp', 'instagram');
create type payment_method as enum ('pix', 'credito', 'debito', 'dinheiro', 'crediario');
create type sale_status as enum (
  'em_andamento', 'finalizada', 'cancelada', 'trocada', 'devolvida', 'parcialmente_devolvida'
);
create type product_status as enum ('ativo', 'inativo');
create type stock_movement_type as enum (
  'entrada', 'saida', 'ajuste', 'perda', 'avaria', 'devolucao', 'troca', 'transferencia', 'inventario'
);
create type purchase_status as enum ('rascunho', 'pedido', 'recebido', 'cancelado');
create type payable_status as enum ('aberto', 'pago', 'vencido');
create type receivable_status as enum ('aberto', 'recebido', 'vencido');
create type cash_movement_type as enum ('abertura', 'sangria', 'reforco', 'fechamento');
create type alert_status as enum ('aberto', 'resolvido', 'ignorado');
create type company_plan as enum ('essencial', 'gestao', 'pro');

-- Empresas e acesso -----------------------------------------------------------

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade_name text not null,
  segment text not null default 'Moda feminina',
  cnpj text,
  city text not null,
  state char(2) not null,
  phone text,
  instagram text,
  logo_initials text,
  plan company_plan not null default 'essencial',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table units (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address text,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Vínculo entre o usuário autenticado e a empresa. É a base de todo o RLS.
create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null default 'vendedor',
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  card_fee_percent numeric(5,2) not null default 3.2,
  tax_percent numeric(5,2) not null default 6,
  max_discount_percent numeric(5,2) not null default 20,
  catalog jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Cadastros -------------------------------------------------------------------

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  city text,
  state char(2),
  phone text,
  categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sellers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  since date not null default current_date,
  commission_rule jsonb not null default '{}'::jsonb,
  monthly_goal numeric(12,2) not null default 0,
  avatar_color text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  email text,
  birthday text,
  city text,
  instagram text,
  preferred_size text,
  preferences text[] not null default '{}',
  notes text,
  seller_id uuid references sellers(id) on delete set null,
  origin text,
  -- LGPD: consentimento explícito para comunicações de marketing.
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  subcategory text,
  collection text,
  brand text,
  supplier_id uuid references suppliers(id) on delete set null,
  material text,
  cost numeric(12,2) not null default 0,
  price numeric(12,2) not null default 0,
  promo_price numeric(12,2),
  sku text not null,
  barcode text,
  status product_status not null default 'ativo',
  entry_date timestamptz not null default now(),
  stock_location text,
  min_stock integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (company_id, sku)
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  color text not null,
  size text not null,
  sku text not null,
  barcode text,
  stock integer not null default 0,
  min_stock integer not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, sku),
  -- O estoque nunca pode ficar negativo: erro de banco em vez de dado inválido.
  constraint stock_non_negative check (stock >= 0)
);

-- Operação --------------------------------------------------------------------

create table sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  code text not null,
  customer_id uuid references customers(id) on delete set null,
  seller_id uuid references sellers(id) on delete set null,
  channel sales_channel not null default 'loja',
  payment_method payment_method not null,
  installments smallint not null default 1,
  status sale_status not null default 'finalizada',
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  total_cost numeric(12,2) not null default 0,
  notes text,
  sold_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  product_id uuid references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  type stock_movement_type not null,
  -- Positivo entra, negativo sai. A soma reconstrói o saldo da variação.
  quantity integer not null,
  reason text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  supplier_id uuid references suppliers(id) on delete set null,
  status purchase_status not null default 'rascunho',
  total numeric(12,2) not null default 0,
  installments smallint not null default 1,
  notes text,
  ordered_at timestamptz not null default now(),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null
);

create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(12,2) not null default 0,
  counted_amount numeric(12,2),
  difference numeric(12,2),
  user_id uuid references auth.users(id) on delete set null
);

create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  session_id uuid not null references cash_sessions(id) on delete cascade,
  type cash_movement_type not null,
  amount numeric(12,2) not null,
  reason text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Financeiro ------------------------------------------------------------------

create table expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  category text not null,
  description text not null,
  amount numeric(12,2) not null,
  is_fixed boolean not null default false,
  spent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table payables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  purchase_id uuid references purchases(id) on delete set null,
  description text not null,
  supplier_name text,
  amount numeric(12,2) not null,
  due_date date not null,
  status payable_status not null default 'aberto',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  description text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  status receivable_status not null default 'aberto',
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  month char(7) not null,
  revenue_target numeric(12,2) not null,
  unique (company_id, month)
);

-- CRM -------------------------------------------------------------------------

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  segment text,
  channel text not null,
  message text,
  recipients integer not null default 0,
  status text not null default 'rascunho',
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table customer_interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  type text not null,
  note text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Alertas são derivados dos dados; aqui guarda-se só a decisão do usuário.
create table alert_states (
  company_id uuid not null references companies(id) on delete cascade,
  alert_key text not null,
  status alert_status not null default 'aberto',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (company_id, alert_key)
);

-- Auditoria -------------------------------------------------------------------

create table activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_name text,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail text,
  -- Valores antes/depois para rastrear o que mudou de fato.
  old_value jsonb,
  new_value jsonb,
  ip inet,
  created_at timestamptz not null default now()
);

-- Índices ---------------------------------------------------------------------
-- Todo acesso é filtrado por empresa, então company_id lidera os índices.

create index on company_users (user_id);
create index on products (company_id, status);
create index on product_variants (company_id, product_id);
create index on sales (company_id, sold_at desc);
create index on sales (company_id, seller_id);
create index on sales (company_id, customer_id);
create index on sale_items (company_id, sale_id);
create index on sale_items (company_id, product_id);
create index on stock_movements (company_id, variant_id, created_at desc);
create index on customers (company_id, name);
create index on expenses (company_id, spent_at desc);
create index on payables (company_id, status, due_date);
create index on receivables (company_id, status, due_date);
create index on activity_log (company_id, created_at desc);
create index on purchases (company_id, status);
create index on cash_movements (company_id, session_id);
