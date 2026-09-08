# Análise & Implementação — Super Admin por Árvore + Whitelabel de E-mail

Data: 2026-09-06
Status: implementado no código (migration 20260906 pronta; aplicação no banco pendente de confirmação)

## Contexto

O sistema hoje possui 3 papéis relevantes para escopo de dados:

- `mega_admin` — dono da plataforma (acesso global esperado).
- `super_admin` — dono de uma **revenda Whitelabel** (cria clínicas filhas e as usa).
- `admin`/`operator`/etc. — time da clínica.

Antes desta mudança, o Super Admin **não via e-mails** dos usuários da árvore (o campo
`email` em `user_profiles` só existiu a partir da migration 20260905, e o RLS de
`user_profiles` não autorizava leitura de outros perfis). A migration
`20260905000000_superadmin_and_email.sql` tentou resolver isso de forma global e
**introduziu um vazamento crítico**.

## 🔴 Crítico encontrado na migration 20260905

A 20260905 reescreveu o RLS das 9 tabelas de negócio para:

```sql
tenant_id = get_user_tenant_id() OR get_user_role() IN ('super_admin','mega_admin')
```

Consequência: **todo** `super_admin` passou a enxergar pacientes, profissionais,
visitas, leads, mensagens, medicamentos, pesquisas e alertas de **todas as revendas
do sistema** (dados clínicos + e-mails). Isto viola LGPD (base legal, proporcionalidade
e minimização) e quebra o isolamento multi-tenant.

Mesmo depois de corrigido o RLS das tabelas de negócio, as políticas de `tenants`
("Users can read own tenant") e `user_profiles` ("Users can read own profile") também
liberavam leitura global para `super_admin`/`mega_admin`.

## Fix aplicado — migration `20260906000000_tree_scoped_superadmin.sql`

### 1. Colunas de marca de e-mail em `tenants`
- `email_from_name`, `email_from_address`, `support_email` (permite remetente por revenda via Resend).

### 2. Índices
- `idx_tenants_parent_id` (recursão da árvore), `idx_user_profiles_tenant_id` (diretório).

### 3. Funções (SECURITY DEFINER, `search_path = public`)
- `get_tenant_tree_ids(root_tenant_id)` — CTE recursiva: revenda + clínicas + equipes.
- `has_tenant_tree_access(target_tenant_id)` — `mega_admin` = true;
  `super_admin` = true apenas para ids da própria árvore; demais = false.

### 4. RLS por árvore nas tabelas de negócio
Política "Tenant isolation" substituída nas 9 tabelas:

```sql
tenant_id = get_user_tenant_id() OR has_tenant_tree_access(tenant_id)
```

`get_user_tenant_id()` preserva o escopo do usuário comum (time da clínica); a árvore
só estende o acesso para quem é dono da revenda. Nenhuma tabela fica "aberta".

### 5. `tenants` — leitura da própria árvore
`id IN tree OR parent_id IN tree` (a revenda enxerga as clínicas da própria árvore,
mais a si mesma).

### 6. `user_profiles` — leitura própria + árvore
`id = auth.uid()` (próprio perfil) ou `tenant_id IN tree`. Mega admin global. O e-mail
fica visível apenas para quem pertence à mesma árvore.

### Notas de segurança
- Funções usam `auth.uid()`; sem sessão autenticada retornam false → anon/sem token não
  acessa nada novo (evita abuso via anon key).
- O vazamento da 20260905 é revertido assim que a 20260906 roda; `DROP POLICY IF EXISTS`
  torna a migration idempotente/reescrita segura.

## Backend (`src/server/app.ts`)

- Helpers: `normalizeCustomDomain`, `isValidCustomDomain`, `assertCustomDomainUsable`
  (rejeita `*.APP_BASE_DOMAIN`, protocolo/path, máscaras inválidas e domínio já em uso).
- `PUT /api/tenant/config`: novos campos `emailFromName`, `emailFromAddress`,
  `supportEmail`; validação de domínio e e-mail.
- `POST /api/admin/tenants`: aceita `tenantType` (`whitelabel` | `homecare`), valida
  domínio custom, insere `tenant_type`, envia convite com marca da revenda e `tenantUrl`
  usando `customDomain` quando presente.
- `POST /api/admin/tenants/:id/invite`: nome da marca resolvido do tenant (ou do pai).
- `GET /api/admin/tenants/:id` + `PUT /api/admin/tenants/:id` (novos): mega admin = qualquer
  tenant; super admin = apenas própria árvore (RPC `get_tenant_tree_ids`). Edita
  nome/CNPJ/plano/logo/status/tipo/domínio custom/subdomínio/cores/emails com validação
  de unicidade de subdomínio.
- `GET /api/admin/user-directory` (novo): mega admin vê todos; super admin vê a própria
  árvore. Retorna usuários + tenants (para "E-mails da Rede").

## Store e UI

- `store.ts` → `updateAdminTenant(id, updates)` (PUT no endpoint novo + refresh).
- `WhitelabelConfig.tsx` → seção "E-mail da Marca" (remetente, endereço, suporte) com
  instruções de Resend/DNS (CNAME para `getAppBaseDomain()`).
- `TenantEditorModal.tsx` → campo `secondaryColor`; edição passou a usar
  `updateAdminTenant`; hint de DNS atualizado.
- `GlobalUserManager.tsx` → reescrito usando `/api/admin/user-directory` (e-mail real do
  perfil, busca por e-mail, tenant map, sem store local removida).
- `NetworkDirectory.tsx` (novo) → diretório de e-mails agrupado por tenant com busca.
- `App.tsx`/`Sidebar.tsx` → rota e item de menu "E-mails da Rede" (`super_contacts`),
  renderizado dentro do `ResellerView` (seção `contacts`).

## Mailer (`src/server/utils/mailer.ts`)

- `BrandSender` + `resolveBrandSender(supabaseAdmin, tenantId?)`:
  clínica → projeta na revenda pai; revenda → usa o próprio remetente; fallback global.
- `sendInviteEmail` aceita `{ tenantId?, brandName? }` e envia o convite com o remetente
  da marca (template e HTML fallback).

## Roadmap próximo (não bloqueia esta entrega)

1. Aplicar migrations `20260905` (se ainda não aplicada) + `20260906` no Supabase e
   rodar os testes RLS opt-in (`node run-sql.js --allow-rls` se necessário).
2. Migrar `localStorage` de dados clínicos → `sessionStorage` com expiração (LGPD).
3. Confirmar `handle_new_user` trigger + o backfill de e-mail em `user_profiles`.
4. Adaptação de cooperativas de cuidadores (roadmap separado).
5. Rotacionar service role key e purgar histórico git (pendência antiga, externa).