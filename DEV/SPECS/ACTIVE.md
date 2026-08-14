# Spec Ativa — Correção de dados mockados/simulados (cadastro real)

## Objetivo
"Valide cada função se tiver dado mockup corrija... quero cadastrar dados reais": eliminar elementos simulados e fazer as telas operarem com dados reais persistidos no banco (financeiro, dashboard, administração, cooperativa, alertas, convites, IA).

## Escopo
1. `store.ts`: auth em todos os fetches de IA (`aiFetch`), fallbacks honestos, RBAC sem localStorage, estado/actions de `invoices` persistidos, `resolvedAlertIds` persistido.
2. Migration `20260809120000_fix_invoices_schema.sql` (reconciliação da tabela `invoices` com schema do app) — aplicada.
3. Views reescritas para dados reais: FinanceView, DashboardView, FamilyDashboardView, AssembliesView, Topbar, CrmView (lead→paciente+contrato), ContractsView, InternalTeamManager, PlanManager, SystemAdminView, ResellerView, CoopFinanceView, SatisfactionView, AlertsView, GlobalUserManager, SupportDesk.
4. `server/app.ts`: endpoints `POST/DELETE /api/admin/users` (mega_admin, convite em tenant `system`); fallbacks de IA em dev retornam 503 honesto.

## Status
**Concluído** (2026-08-09) — code, migration aplicada, testes (64), typecheck e build verdes.

## Aceite
1. `npm run typecheck`: verde.
2. `npx vitest run`: 64 testes verdes (14 skipped RLS).
3. `npm run build`: verde.
4. Migration `20260809120000_fix_invoices_schema.sql` aplicada (13 aplicadas / 0 pendentes); `invoices`, `support_tickets` e `ticket_messages` verificados no banco.
5. Fallback de IA em dev: 503 honesto sem `GEMINI_API_KEY` (teste atualizado).

---
## Spec anterior — Convites de Revenda e Painel Super Admin (Whitelabel, concluído 2026-08-07)

## Objetivo
Permitir que o Mega Admin crie revendas (whitelabel) e que o Super Admin gerencie clínicas clientes, com criação de conta via link de convite (e-mail + senha) e painel exclusivo para o Super Admin.

## Decisões do maestro (2026-08-07)
- Entrega do convite: **somente link copiável** (sem envio de e-mail automático).
- Criação de conta: **e-mail + senha** (não magic link).
- Painel do Super Admin: **visão geral + gestão de clínicas** + configuração whitelabel.

## Escopo
1. Tabela `tenant_invitations` + RLS + função `generate_invite_token()` (migration).
2. Endpoints: `POST /api/admin/tenants`, `POST /api/admin/tenants/:id/invite`, `GET /api/invites/:token`, `POST /api/invites/accept`.
3. Store: `refreshTenants`, `createTenantWithInvite`, `regenerateInvite`; `init()` carrega tenants do Supabase.
4. UI: `InviteAcceptView` (aceite público), `InviteLinkModal` (link copiável), `TenantEditorModal` (criação com email do admin), `SystemAdminView` (botão reenvio de convite), `ResellerView` (painel exclusivo do Super Admin), `App.tsx` (rota `/?invite=`).

## Regras de negócio
- Mega Admin cria revenda (sem `parentId` → role `super_admin`). Com `parentId` → role `admin`.
- Super Admin cria/convida clínicas apenas sob o próprio tenant (`parent_id = tenant_id` do super admin).
- Convite expira em 7 dias (`INVITE_TTL_MS`); token = `crypto.randomBytes(32).hex`.
- Aceite cria usuário via `auth.admin.createUser` com `email_confirm: true` e auto-login.

## Status
**Concluído** (2026-08-07) — code, migration aplicada, testes, typecheck e build verdes.

## Aceite
1. `npm run typecheck`: verde.
2. `npx vitest run`: 58 testes, todos passando (50 server + 5 types + 4 store; 14 RLS skip).
3. `npm run build`: verde.
4. Migration `20260807000000_add_tenant_invitations.sql` aplicada (10 aplicadas / 0 pendentes) e tabela verificada no banco.
