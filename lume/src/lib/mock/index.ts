/**
 * "Banco de dados" de demonstração do Lume.
 *
 * Esta é a camada que será substituída pelo Supabase na Etapa 5: cada
 * coleção vira uma tabela (com RLS por company_id) e este módulo vira o
 * cliente de dados. Tudo é determinístico — servidor e cliente geram
 * exatamente a mesma massa.
 */

export { COMPANY_ID, demoCompany, demoCompanyUsers, demoGoals, demoSellers, demoSuppliers, demoUnits, demoUser } from "./core";
export { demoProducts, demoVariants, variantsByProduct } from "./products";
export { demoCustomers, type CustomerProfile, type DemoCustomer } from "./customers";
export { demoSales, HISTORY_DAYS } from "./sales";
export { demoExpenses, demoPayables, demoReceivables } from "./finance";
export { demoActivityLog } from "./activity";
