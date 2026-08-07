# Spec Ativa — Convites de Revenda e Painel Super Admin (Whitelabel)

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
