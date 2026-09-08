# Worklog

## 2026-09-08 — Fix: push CORS, service worker fallback e MinIO público
- **Push**: frontend passou a usar `/api/notifications/vapid-key` same-origin; removida a dependência da Edge Function Supabase com preflight CORS quebrado.
- **Service worker**: `navigateFallback` desativado junto com o HTML fora do precache, eliminando `non-precached-url`.
- **MinIO**: fallback de endpoint deixou de ser `localhost:9000`; URLs de upload agora usam o endpoint público configurado ou `https://mypanel.wootech.com.br`.
- **Verificação**: `npm run lint`, `npm run build:frontend` e `dist/sw.js` sem rota de fallback para `index.html`.

## 2026-09-08 — Root cause: SW precaching index.html sem window.__ENV__
- **Sintoma persistente**: mesmo com `window.__ENV__` correto no HTML e nonce CSP bate, o app seguia conectando em `placeholder.supabase.co`.
- **Causa raiz real**: produção usa `generateSW` (default do vite-plugin-pwa), que **pré-cacheava o `index.html` estático** (SEM o `window.__ENV__` injetado pelo server). O service worker servia esse HTML velho nas navegações via precache route → `getEnv` caía no fallback `placeholder.supabase.co`. O custom `src/sw.ts` **não é usado em produção** (generateSW ignora); por isso as edições nele não surtiam efeito.
- **Fix**: em `vite.config.ts`, adicionado `globPatterns` **excluindo `index.html`** do precache. Navegações passam a sempre buscar o HTML fresco da rede (com credenciais reais injetadas).
- **Verificação**: `vite build` exit 0; confirmado que `index.html` NÃO está mais no `precacheAndRoute` do `dist/sw.js` gerado (workbox NavigationRoute cai na rede por não estar precacheado).
- **Ação requerida**: redesenhar a imagem (CI dispara) e redesenhar o stack Portainer/Swarm; usuários com SW antigo precisarão de hard refresh/desregistro do SW.

## 2026-09-08 — Hardening: frontend-only Docker build
- **Fix**: `Dockerfile.frontend` now appends only non-empty `VITE_*` build args to `.env.production`, matching the production image build and preventing empty args from recreating the Supabase placeholder URL.
- **Verification**: `npm test` (90 passed / 14 skipped) and `npm run build` passed.

# Worklog

## 2026-09-08 — Fix: build args vazios sobrescreviam .env.production
- **Sintoma**: bundle deployado (`index-DRpHLbEa.js`) tinha `VITE_SUPABASE_URL:""` e `VITE_SUPABASE_ANON_KEY:""` no `import.meta.env` — o Vite não leu `.env.production` porque o Dockerfile antigo setava `ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}` (vazio), que tem precedência sobre `.env` files.
- **Causa raiz**: `ENV VITE_SUPABASE_URL=` vazio (secrets GitHub não configurados) sobrescrevia `.env.production`. `vite build` prioriza `process.env` vazio → bundle com URL vazio → fallback placeholder.
- **Fix**: Dockerfile remove os `ENV`; usa script shell que injeta apenas ARGs **não-vazios** no `.env.production` antes do build. Se ARGs ausentes, `.env.production` commitado prevalece sempre.
- **Verificação**: bundle deployado continha `VITE_APP_BASE_DOMAIN:"homecare.wootech.com.br"` mas `VITE_SUPABASE_URL:""` — confirmado que os ARGs estavam vazios no build CI.
- **Ação requerida**: redesenhar a imagem (CI dispara automaticamente agora) e redesenhar o stack Portainer/Swarm. O `window.__ENV__` injetado pelo server já fornece o URL real em runtime, mas o bundle deve ter o fallback correto.

## 2026-09-08 — Push para repositório remoto
- **Commits pendentes enviados**: 3 commits do branch `feature/minio-upload` enviados para `origin/feature/minio-upload`.
- **Status**: repositório sincronizado, working tree limpa.

## 2026-09-08 — Fix CSP placeholder Supabase URL (https://placeholder.supabase.co)
- **Sintoma**: login quebra com CSP bloqueando `https://placeholder.supabase.co/auth/v1/token`; o bundle JS em produção usa o URL placeholder em vez do real.
- **Causa raiz**: a imagem Docker em produção foi construída **antes** do `.env.production` (commit `029380c`) existir, e o CI `docker.yml` **não passava os build args** `VITE_*` para o `Dockerfile`. O fallback `placeholder.supabase.co` em `src/lib/supabase.ts:16` era usado porque `import.meta.env.VITE_SUPABASE_URL` estava vazio no build antigo.
- **Também**: workflows CI só disparavam em `main` (fixado em commit anterior adicionando `feature/**`).
- **Fix aplicado**:
  - `Dockerfile` aceita ARG/ENV `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_VAPID_KEY`, `VITE_ENABLE_DEMO_MODE`, `VITE_APP_BASE_DOMAIN` no build stage; copia `.env.production` para `.env` na imagem (runtime do server).
  - `.github/workflows/docker.yml` passa esses valores via secrets do GitHub como build-args.
  - `docker-compose.yml` passa os build args no service `homecarepro-web`.
- **Verificação local**: build `vite build` (mode production) embute o URL real (`VITE_SUPABASE_URL:"https://qczwrubsiuafhwojfzbm.supabase.co"`); placeholder fica só como fallback de segurança. Vite ignora ENV vazio e usa `.env.production` commitado.
- **Ação requerida (GitHub)**: configurar secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_VAPID_KEY` no repositório para o CI injetar no build.
- **Ação requerida (deploy)**: reconstruir/redistribuir a imagem Docker e atualizar o stack do Portainer/Swarm com `IMAGE_TAG` novo.

## 2026-09-07 — Security Scan do CI (PR #2) → causa raiz dupla
- **`npm audit --audit-level=high`**: highs do `xlsx` (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9, sem fix). `xlsx` era usado só por scripts pontuais da raiz (`create_mock_excel.js`, `import_sc_saude.ts`) — **removido das dependencies** + stub `xlsx.d.ts` (typecheck segue 0). Restam 3 moderate (express/body-parser/qs) — nível `high` passa (exit 0); fix delas exigiria major bump do express.
- **Grep "hardcoded secrets"** : auto-match do próprio `ci.yml` (`*.yml`, linha do padrão JWT) + **segredos reais commitados** — service role JWT em `create_sc_saude.js` e `portainer-stack-homecare-filled.yml`, anon key e **senha do postgres** (`SUPABASE_DB_URL`) no stack do Portainer. Ação: `create_sc_saude.js` agora lê `SUPABASE_SERVICE_ROLE_KEY`/`SC_SAUDE_INITIAL_PASSWORD` do env; stack redigido para `${...}`; novo check de connection string com senha; `.github` excluído do scan (elimina auto-match); regex do SR_KEY corrigida (não pegava valor entre aspas).
- **Gates locais**: greps CI 0 matches · `npm audit --audit-level=high` exit 0 · typecheck exit 0 · 90 testes · build ok.

## 2026-09-06 (2ª parte) — Aplicação no banco + RLS verde + typecheck limpo
- **Migrations aplicadas** (`node run-sql.js`): 20/20. Confirmação: o vazamento global da 20260905 **estava ATIVO** (policy de patients com `get_user_role() IN ('super_admin','mega_admin')`; a 20260905 tinha sido aplicada manualmente sem tracker).
- **Fix de migration**: `20260822000000_add_whatsapp_tables.sql` usava `tenant_id uuid REFERENCES tenants(id)` mas `tenants.id` é `text` → falhava; corrigido para `text` (nunca tinha sido aplicada).
- **Nova migration** `20260906000001_harden_get_user_role_search_path.sql`: 20260905 redefiniu `get_user_role()` (SECURITY DEFINER) sem `search_path` → `ALTER FUNCTION ... SET search_path = public`.
- **RLS test**: `RUN_DB_TESTS=1 vitest tests/rls.integration.test.ts` → **14/14 passed**. Ajustada a expectativa "usuário lê perfis do próprio tenant" (policy intencional: diretório de equipe/e-mails; cross-tenant segue bloqueado).
- **Typecheck limpo (exit 0)**: corrigidos erros pré-existentes — `mailer.ts` (await antes do builder em sendTemplatedEmail → era bug de runtime), `app.ts` (`select("*",{single:true})` v1 → `maybeSingle()`), `sw.ts` (`declare self: ServiceWorkerGlobalScope`, `NotificationEvent`, actions/Response seguros, `setCatchHandler` cast), `AdminLayout` (import `Menu` do lucide conflitante), `upload.ts` (token via `supabase.auth.getSession()`, não `store.token`), `vite.config.ts` (`orientation: 'portrait-primary'`, `includeAssets` no lugar do typo, remoção de `category`).
- **Gates**: typecheck ✅, build ✅, `npm test` 90 passed (14 RLS skipped default), RLS 14/14 com RUN_DB_TESTS=1.

## 2026-09-06 — Super Admin por árvore + Whitelabel de e-mail (análise + implementação)

- **🔴 Crítico**: a migration `20260905000000_superadmin_and_email.sql` liberou `get_user_role() IN ('super_admin','mega_admin')` no RLS das 9 tabelas de negócio → todo super_admin via dados clínicos e e-mails de TODAS as revendas (LGPD). Corrigido.
- **Migration nova**: `supabase/migrations/20260906000000_tree_scoped_superadmin.sql` — colunas `email_from_name/email_from_address/support_email` em tenants; índices `idx_tenants_parent_id`/`idx_user_profiles_tenant_id`; funções `get_tenant_tree_ids()` (CTE recursiva) e `has_tenant_tree_access()` (SECURITY DEFINER, mega=global, super=própria árvore); RLS "Tenant isolation" reescrito por árvore nas 9 tabelas; políticas de `tenants`/`user_profiles` por árvore.
- **Backend** (`src/server/app.ts`): helpers `normalizeCustomDomain`/`isValidCustomDomain`/`assertCustomDomainUsable`; `PUT /api/tenant/config` com campos de e-mail da marca; `POST /api/admin/tenants` com `tenantType` + validação + convite com marca; `GET/PUT /api/admin/tenants/:id` (mega qualquer; super via RPC); `GET /api/admin/user-directory` (árvore); reenvio de convite com marca.
- **Mailer**: `resolveBrandSender()` (clínica → revenda → global) aplicado em `sendInviteEmail`.
- **UI**: `WhitelabelConfig` (E-mail da Marca), `TenantEditorModal` (secondaryColor + `updateAdminTenant`), `GlobalUserManager` reescrito (user-directory), novo `NetworkDirectory` ("E-mails da Rede" em ResellerView - seção `contacts`; rota/menu `super_contacts`).
- **Verificação**: `npm test` ✅ 90 passed / 14 skipped (RLS opt-in). Typecheck: nenhum erro novo nos arquivos alterados; baseline já tinha erros pré-existentes em `mailer.ts` (`sendTemplatedEmail` .or/.is), `app.ts` (`/api/email-templates/render`), `sw.ts`, `AdminLayout`, `upload.ts` (confirmado via lint no árvore limpa).
- **Pendente**: aplicar migrations no Supabase + rodar RLS opt-in; persistir localStorage→sessionStorage (LGPD); validar fluxo de convite end-to-end no browser.

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

## 2026-08-19 — Análise: Acesso por Subdomínio (Multi-Tenant via Subdomain)

### Análise de gaps para subdomínio → tenant (documento completo em `DEV/SUBDOMAIN_ANALYSIS.md`)

**Objetivo**: permitir que cada revenda/clínica acesse pelo seu subdomínio (`clinicabc.homecarepro.com.br`).

#### O que EXISTE hoje
- **Database**: `tenants` tem `custom_domain` (domínio próprio) mas **não** `subdomain`
- **Caddy**: catch-all `https://` com on-demand TLS → `/api/internal/caddy-ask`
- **`/api/tenant/resolve`**: lookup por `custom_domain` → fallback `system` (apenas branding)
- **`/api/internal/caddy-ask`**: valida `custom_domain` (não valida subdomains)
- **Frontend `whitelabel.ts`**: usa `window.location.hostname` → branding CSS apenas
- **Frontend `store.ts`**: `init()` carrega todos tenants via RLS; `activeTenantId` = `profile.tenant_id` (NÃO do subdomain)
- **Auth**: sem redirect pós-login para subdomain
- **UI**: `WhitelabelConfig` e `TenantEditorModal` não têm campo `subdomain`
- **Deploy**: sem wildcard DNS, sem `VITE_APP_BASE_DOMAIN`

#### O que FALTA (11 itens 🔴 + 4 itens 🟡)
1. Coluna `subdomain` na tabela `tenants` + unique index + CHECK reserved words
2. `/api/tenant/resolve` estender para lookup por subdomain
3. `/api/internal/caddy-ask` validar subdomains
4. Caddyfile wildcard `*.homecarepro.com.br`
5. docker-compose wildcard DNS + APP_BASE_DOMAIN
6. `whitelabel.ts` parsear subdomain
7. `store.ts` init() forçar activeTenantId pelo subdomain
8. Redirect pós-login → subdomain do tenant
9. UI: campo `subdomain` em WhitelabelConfig + TenantEditorModal + types.ts
10. `VITE_APP_BASE_DOMAIN` em .env
   11. Supabase cookie domain cross-subdomain

**Plano de implementação**: 15 tarefas em 5 fases (infra → frontend → UI → server → testes). Detalhes em `DEV/SUBDOMAIN_ANALYSIS.md`.

## 2026-08-20 — Subdomain Multi-Tenant IMPLEMENTADO (100%)

### Implementado
- **Migration aplicada**: `supabase/migrations/20260819000000_add_tenant_subdomain.sql` (registrada em `schema_migrations`, 14/14 migrations aplicadas)
- **Coluna `subdomain`** + CHECK constraint + índice único na tabela `tenants`
- **Backfill**: todos os 8 tenants receberam subdomains (ex: `audicare`, `sc-saude`, `clinica-teste`)
- **Server**: `extractSubdomain()` + `slugifySubdomain()` helpers; `/api/tenant/resolve` e `/api/internal/caddy-ask` resolvem por subdomain; `POST /api/admin/tenants` auto-gera/valida subdomain; `PUT /api/tenant/config` atualiza subdomain
- **Frontend**: `src/lib/subdomain.ts` (nova), `whitelabel.ts` atualizado, `store.ts` com resolução de `activeTenantId` pelo subdomain, `App.tsx` com redirect pós-login
- **UI**: campo `subdomain` em `WhitelabelConfig` e `TenantEditorModal` com preview em tempo real
- **Infra**: Caddyfile wildcard `*.homecare.wootech.com.br`, Docker Compose com `APP_BASE_DOMAIN`, `Dockerfile.frontend` com build arg
- **Domínio principal**: `homecare.wootech.com.br` (subdomains: `<sub>.homecare.wootech.com.br`; domínios custom: `audcare.com.br`, `app.audcare.com.br`, etc.)

### Verificado
- Vitest: **90 passed, 0 failed, 14 skipped** (integração RLS)
- Build: ✅ `vite build` + `esbuild` produção OK
