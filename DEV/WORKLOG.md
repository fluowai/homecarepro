# Worklog

## 2026-08-07 (convites de revenda e painel Super Admin)
- Nova migration `20260807000000_add_tenant_invitations.sql` (tabela `tenant_invitations` + RLS + `generate_invite_token()`), aplicada no banco (10 aplicadas / 0 pendentes; colunas verificadas).
- `src/server/app.ts`: endpoints `POST /api/admin/tenants`, `POST /api/admin/tenants/:id/invite`, `GET /api/invites/:token`, `POST /api/invites/accept` (criação de conta via `auth.admin.createUser` com `email_confirm` e auto-login no front).
- `src/store.ts`: novas ações `refreshTenants`, `createTenantWithInvite`, `regenerateInvite`; `init()` agora carrega tenants do Supabase.
- UI: `InviteAcceptView` (aceite público), `InviteLinkModal` (link copiável), `TenantEditorModal` (criação com email do admin + modal de link), `SystemAdminView` (reenvio de convite por revenda), `ResellerView` redesenhado como painel exclusivo do Super Admin (visão geral + gestão de clínicas + whitelabel), `App.tsx` captura `?invite=` e renderiza o aceite.
- Testes: 50 no `server.test.ts` (15 novos p/ convites), todos verdes. Typecheck e build verdes.

## 2026-08-04 (runner de migrations)
- `run-sql.js` reescrito com controle de versão: tabela `public.schema_migrations`, executa somente migrations pendentes, em transação (rollback em falha), modo `--baseline` para adotar em banco já migrado e carrega `.env` via dotenv.
- Baseline aplicado: 9 migrations registradas como aplicadas (não re-executadas).
- Selftest end-to-end aprovado (migration descartável executada e registrada; artefato removido).
- Rodando `node run-sql.js` agora: 9 aplicadas / 0 pendentes.

## 2026-08-04 (banco aplicado)
- Aplicadas 2 migrations pendentes no Supabase (via pg direto; `run-sql.js` não é idempotente no schema inicial):
  - `20260729111700_add_billing_schema.sql` → criou `subscriptions`, `invoices`, `asaas_customer_id` (coluna em tenants), 4 policies de billing.
  - `20260804000002_harden_rls_functions.sql` → `search_path=public` em `get_user_role`, `get_user_tenant_id`, `has_tenant_access`.
- Verificado: tabelas, coluna e policies presentes; healthcheck `/api/health` 200 (database up).

## 2026-08-04 (execução)
- Bloqueadores de produção corrigidos (verificados: typecheck, build e 9 testes verdes; smoke test de produção 200 OK).
- Corrigido typecheck: `GlobalUserManager.tsx` (import `Users`) e `DEV/create-admin.ts` (tipo + senha removida do código).
- Removido role switcher da `Sidebar.tsx` (RBAC client-side) → badge somente leitura.
- `store.ts`: modo demo agora exige `VITE_ENABLE_DEMO_MODE=true` (dev-only por padrão); `init()` nunca mais autentica em erro; role não é mais persistida em localStorage.
- `AuthView.tsx`: removida flag `homecare_pro_has_mega_admin` (elevação de admin client-side).
- `docker-compose.prod.yml`: chaves hardcoded (service role) substituídas por `${VAR}`.
- `server.ts`: fallback de IA simulado desabilitado em produção (503); erros de IA genéricos (sem vazar `error.message`); webhook Asaas com idempotência anti-replay.
- Nova migration `20260804000002_harden_rls_functions.sql` (search_path em SECURITY DEFINER).
- CI: `npm audit` bloqueia em high; scan de segredos detecta JWT/service_role; testes via `npx vitest run`; bundle-size robusto.

## 2026-08-04
- Análise completa de prontidão para produção (nenhum código alterado).
- Criados DEV/INDEX.md, DEV/CONTEXT.md, DEV/HANDOFF.md, DEV/SPECS/ACTIVE.md, DEV/PRODUCTION_READINESS.md.
- Achados críticos: service role key commitada em docker-compose.prod.yml, fallback demo autentica sem sessão, RBAC client-side com role switcher, typecheck quebrado (2 erros), features simuladas (arquivos/WhatsApp/GPS/IA).
- Verificação: build OK, 9 testes OK, typecheck FALHA, npm audit 1 moderada.

## 2026-08-03
- Refactored server.ts to inject VITE_ environment variables into index.html via window.__ENV__ to solve production Docker issues.
- Updated src/lib/supabase.ts to prioritize window.__ENV__ over import.meta.env.
- Removed duplicate /api/health route from server.ts.
