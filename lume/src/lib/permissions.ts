import type { Role } from "@/lib/types";

/**
 * Permissões por perfil.
 *
 * Espelham as políticas de RLS em supabase/migrations/0002_rls.sql. A checagem
 * aqui é de experiência — esconder o que a pessoa não pode usar; a garantia
 * real fica no banco, que recusa a operação mesmo se a tela for burlada.
 */

export type Permission =
  | "dashboard.ver"
  | "vendas.ver"
  | "vendas.criar"
  | "vendas.cancelar"
  | "caixa.operar"
  | "produtos.ver"
  | "produtos.editar"
  | "estoque.ver"
  | "estoque.ajustar"
  | "compras.ver"
  | "compras.gerenciar"
  | "clientes.ver"
  | "clientes.editar"
  | "vendedores.ver"
  | "vendedores.gerenciar"
  | "financeiro.ver"
  | "financeiro.gerenciar"
  | "relatorios.ver"
  | "catalogo.gerenciar"
  | "alertas.ver"
  | "configuracoes.ver"
  | "configuracoes.editar"
  | "equipe.gerenciar";

const ALL: Permission[] = [
  "dashboard.ver",
  "vendas.ver",
  "vendas.criar",
  "vendas.cancelar",
  "caixa.operar",
  "produtos.ver",
  "produtos.editar",
  "estoque.ver",
  "estoque.ajustar",
  "compras.ver",
  "compras.gerenciar",
  "clientes.ver",
  "clientes.editar",
  "vendedores.ver",
  "vendedores.gerenciar",
  "financeiro.ver",
  "financeiro.gerenciar",
  "relatorios.ver",
  "catalogo.gerenciar",
  "alertas.ver",
  "configuracoes.ver",
  "configuracoes.editar",
  "equipe.gerenciar",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  proprietario: ALL,
  gerente: ALL.filter((p) => p !== "equipe.gerenciar"),
  vendedor: [
    "dashboard.ver",
    "vendas.ver",
    "vendas.criar",
    "produtos.ver",
    "estoque.ver",
    "clientes.ver",
    "clientes.editar",
    "catalogo.gerenciar",
    "alertas.ver",
  ],
  caixa: [
    "vendas.ver",
    "vendas.criar",
    "caixa.operar",
    "produtos.ver",
    "estoque.ver",
    "clientes.ver",
    "clientes.editar",
  ],
  estoquista: [
    "produtos.ver",
    "produtos.editar",
    "estoque.ver",
    "estoque.ajustar",
    "compras.ver",
    "compras.gerenciar",
    "alertas.ver",
  ],
  financeiro: [
    "dashboard.ver",
    "vendas.ver",
    "financeiro.ver",
    "financeiro.gerenciar",
    "compras.ver",
    "compras.gerenciar",
    "relatorios.ver",
    "alertas.ver",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Permissão exigida por rota, para filtrar o menu e proteger a navegação. */
export const ROUTE_PERMISSION: Record<string, Permission> = {
  "/visao-geral": "dashboard.ver",
  "/vendas": "vendas.ver",
  "/caixa": "caixa.operar",
  "/produtos": "produtos.ver",
  "/estoque": "estoque.ver",
  "/compras": "compras.ver",
  "/clientes": "clientes.ver",
  "/vendedores": "vendedores.ver",
  "/financeiro": "financeiro.ver",
  "/catalogo": "catalogo.gerenciar",
  "/relatorios": "relatorios.ver",
  "/alertas": "alertas.ver",
  "/configuracoes": "configuracoes.ver",
};
