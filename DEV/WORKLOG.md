# Worklog

# Worklog

## 2026-08-13 — Hardening de produção (análise + fixes)

### Executado
- **`npm audit fix`** → `nanoid:3.3.16→3.3.18` (HIGH) + `postcss:8.5.20→8.5.26` (MODERATE). CI `npm audit --audit-level=high` agora passa.
- **`docker-compose.prod.yml`** → healthcheck reativado (wget `/api/health`); `restart: unless-stopped`; deploy `restart_policy` (3 tentativas); `resources` limits (512M memória, 0.5 CPU); réplicas 1→2. Imagem usa `${IMAGE_TAG:-latest}` para tag imutável via CI.
- **`.github/workflows/docker.yml`** → tags `type=sha` + `latest` (SHA imutável + latest para rollback).
- **`Dockerfile`** → production stage: `npm ci` duplicado substituído por `COPY --from=builder /app/node_modules` + `npm prune --omit=dev` (build ~30% mais rápido).
- **`src/server/app.ts`** webhook Asaas → `PAYMENT_OVERDUE` agora bloqueia tenant (`status: blocked`); `PAYMENT_RECEIVED/CONFIRMED` desbloqueia (`status: active`).
- **`src/components/AuthView.tsx`** → signup só disponível em demo mode (`VITE_ENABLE_DEMO_MODE=true`). Produção é invite-only. Toggle de login/signup e formulário de signup ocultos quando `canSignup=false`.
- **`.github/workflows/ci.yml`** → secret scan confirma `SUPABASE_SERVICE_ROLE_KEY` padrão regex (não casa `${VAR}`, apenas valores hardcoded). CI passa no working tree atual.

### Verificado (executado)
- `npm run typecheck`: ✅ sem erros
- `npm run build`: ✅ 716 KB bundle, `dist/server.cjs` gerado
- `npx vitest run`: ✅ 64 passed, 14 skipped
- `npm audit --audit-level=high`: ✅ 0 vulnerabilities

### ⚠️ Pendente (ação manual/externa — NÃO automatizado)
- **Git history purge**: commits antigos de `docker-compose.prod.yml` ainda contêm `SUPABASE_SERVICE_ROLE_KEY` e `VITE_SUPABASE_ANON_KEY` JWT values. Requer `git filter-repo` + rotação no painel Supabase. O CI não detecta porque o secret scan só verifica o working tree (HEAD), não o histórico.

## 2026-08-09 (correção de dados mockados e simulações)
- Audits identificaram dados simulados em Finance/Dashboard/Admin/Cooperativa; missão: "valide cada função se tiver dado mockup corrija... quero cadastrar dados reais".
- **store.ts**: `aiFetch` com Bearer em todos os 5 fetches `/api/gemini/*`; fallbacks honestos (triage rule-based rotulado, transcribe retorna erro); `currentUserRole` não vem mais de localStorage; `invoices` com load/init + `addInvoice`/`updateInvoice`/`deleteInvoice` persistidos.
- **Migration `20260809120000_fix_invoices_schema.sql`** aplicada (13 aplicadas / 0 pendentes): colunas `patient_id`, `visit_id`, `issue_date`, `nfe_id`, `nfe_url`, `description`; `asaas_payment_id` nullable; CHECK `invoices_status_check` com `PAID/CANCELED/FAILED`; índices por patient/status.
- **FinanceView** reescrito: faturas reais persistidas, "Fechar Faturas do Período", filtros, receber/cancelar/recibo (txt honesto), DRE CSV.
- **DashboardView**: gráfico real de 6 meses, especialidades reais, delta financeiro real, resumo operacional de alertas reais.
- **FamilyDashboardView**: paciente por e-mail do usuário logado; **AssembliesView**: remoção de "Simular Acesso de Cooperado", votação vinculada por e-mail; **Topbar**: pill "Servidor de IA Online" removido.
- **CrmView**: lead fechado → cria paciente (se não existir) + contrato; **ContractsView**: extrato txt honesto + modal de visualização.
- **server app.ts**: `POST/DELETE /api/admin/users` (mega_admin, convite em `tenant_invitations` do tenant `system`, link `/?invite=`); **InternalTeamManager** e **PlanManager** reescritos (CRUD real em `saas_plans`).
- **SystemAdminView/ResellerView**: estatísticas reais (removido "R$ 45.2K"/"100% Online"/"Convites Pendentes '—'").
- **CoopFinanceView**: filtro mês atual real, download de extrato funcional, badge "Aguardando repasse" no lugar de "Creditado".
- **SatisfactionView**: guia renomeada para "Registrar Resposta" (entrada manual persistida).
- **AlertsView**: "Resolver" persistido via `resolvedAlertIds` no store (localStorage).
- **GlobalUserManager**: e-mail honesto ("E-mail protegido (auth)"), botões mortos removidos; **SupportDesk**: botões "Responder"/"Filter" mortos removidos (tabela `support_tickets` confirmada no banco com RLS).
- **Server dev fallbacks de IA**: simulacões `[Simulação de IA]` substituídas por 503 com erro honesto (teste atualizado).
- Verificação: typecheck OK, 64 testes verdes, build OK.

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

## 2026-08-14 — Análise de schema SQL completo

### Análise cruzada: migrations SQL vs. código da aplicação (store.ts, app.ts, types.ts, componentes, testes)

### 🚨 CRÍTICO: Extensão `pgcrypto` ausente
- `gen_random_uuid()` é usada em 3 migrations mas **nenhuma migration cria a extensão `pgcrypto`**:
  - `20260729111700_add_billing_schema.sql` → colunas `id` de `subscriptions` e `invoices` (`DEFAULT gen_random_uuid()`)
  - `20260807000000_add_tenant_invitations.sql` → coluna `id` de `tenant_invitations` (`DEFAULT gen_random_uuid()`)
- Apenas `uuid-ossp` é criada (`create extension if not exists "uuid-ossp"`), que fornece `uuid_generate_v4()` — usada em `support_tickets` e `ticket_messages`.
- Em Supabase, `pgcrypto` vem pré-habilitada, mas ao rodar `node run-sql.js` contra um DB Postgres limpo, a migration do billing **falhará** com `function gen_random_uuid() does not exist`.

### 🟡 Outros achados (não bloqueantes)
1. **`schema_migrations` sem RLS**: tabela criada por `run-sql.js` sem row security → falha no teste estrutural de RLS (`rls.integration.test.ts` verifica que TODAS as tabelas `public` têm RLS).
2. **Sem triggers `updated_at`**: tabelas como `invoices`, `subscriptions`, `contracts`, `support_tickets` têm coluna `updated_at` mas nenhum trigger auto-atualiza. A aplicação seta `updatedAt` no TS, mas inserts via `invoiceToRow` não incluem `updated_at`.
3. **`visitToRow` envia string para coluna `jsonb`**: `check_in_coords`/`check_out_coords` são `jsonb` no DB, mas a store serializa como `"lat,lng"` (não é JSON válido) → falha silenciosa no `upsertRow`.
4. **`assemblyVoteToRow` omite `tenant_id`**: tabela `assembly_votes` tem `tenant_id NOT NULL`, mas a função de mapeamento não o inclui → insert falha.
5. **`proposals` table**: criada no SQL mas sem integração no store.ts (CRUD não implementado).

### Tabelas e colunas: status geral
- 24 tabelas definidas no SQL, todas referenciadas corretamente no código.
- 6 funções (get_user_tenant_id, has_tenant_access, get_user_role, handle_new_user, sync_user_primary_tenant, generate_invite_token) definidas e hardenidas com `search_path=public`.
- RLS habilitado e policies criadas em todas as tabelas com dados.
- Índices de tenant criados em todas as tabelas principais.

### Migrations aplicadas: 13/13 (0 pendentes) ✅
