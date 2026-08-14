# Prontidão para Produção — Análise Completa (2026-08-04, atualizada 2026-08-13)

Relatório executado via orquestrador. Sistema: **HomeCare Pro** — SaaS multi-tenant de gestão de home care (React 19 + Vite + Express + Supabase + Docker/Traefik).

## Status atualizado (2026-08-13) — Análise de produção

| Item | Status | Ação |
|---|---|---|
| #1 Segredo no docker-compose.prod.yml | ✅ Arquivo corrigido (`${VAR}`); **histórico git ainda expõe a chave antiga** | **CRÍTICO**: rotacionar service_role no painel Supabase + purgar histórico com `git filter-repo` (manual) |
| #2 Fallback demo/init | ✅ `init()` não autentica em erro | ✅ |
| #3 Role switcher | ✅ Removido (badge somente leitura) | ✅ |
| #4 Typecheck | ✅ Verde | ✅ |
| #5 Cadastro aberto | ✅ Agora só faz signup em demo mode (`VITE_ENABLE_DEMO_MODE=true`); produção é invite-only | ✅ Code change (2026-08-13) |
| #6 CSP unsafe-inline/eval | ⏳ Pendente | `server.ts:87-91` injeta `window.__ENV__` inline; migrar para nonce ou JSON estático |
| #7 Webhook Asaas idempotência | ✅ Anti-replay em memória; **tenant blocking implementado** | ✅ Code fix (2026-08-13) |
| #8 Erros de IA vazados | ✅ Genéricos; 503 honesto | ✅ |
| #9 localStorage de dados clínicos | ⏳ Pendente | Migrar para sessionStorage com expiração (risco LGPD) |
| #10 Features simuladas | ⚠️ Parcialmente corrigido (dados mockados removidos); arquivos/WhatsApp/GPS ainda não são reais | Decisão de produto |
| #11 Migrations sem tracking | ✅ Runner com `schema_migrations` (2026-08-04); **ainda não há gate de produção** | Adicionar verificação de versão no CI |
| #12 SECURITY DEFINER search_path | ✅ Migration `20260804000002_harden_rls_functions.sql` | ✅ |
| #13/#14 CI | ✅ Audit bloqueante + scan secrets; **nanoid HIGH vuln corrigida** (2026-08-13) | `npm audit fix` aplicado |
| #17 Healthcheck Docker | ⏳ Removido de docker-compose.prod.yml | ✅ **Reaçoado** (2026-08-13) |
| #18 Docker tag `latest` | ✅ CI agora usa SHA + latest | ✅ CI fix (2026-08-13) |
| #19 Dockerfile duplicado | ✅ `npm ci` no prod stage substituído por copy+prune | ✅ Dockerfile otimizado (2026-08-13) |
| #20 Resource limits / replicas | ⏳ Pendente | ✅ **Adicionado** ao docker-compose.prod.yml (2026-08-13) |

### Verificação automatizada em 2026-08-13

| Comando | Resultado |
|---|---|
| `npm run typecheck` | ✅ Sem erros |
| `npm run build` | ✅ Bundle 716 KB (limite CI 1.5 MB); `dist/server.cjs` gerado |
| `npx vitest run` | ✅ 64 passed, 14 skipped (RLS opt-in) |
| `npm audit --audit-level=high` | ✅ 0 vulnerabilidades (após `npm audit fix`) |
| `git ls-files .env` | ✅ Não trackado (.env.gitinored) |
| Secret scan (CI) | ✅ Nenhum JWT/service_role em arquivos tracked |
| **Git history secret scan** | ❌ **Supabase keys expostos em commits antigos de docker-compose.prod.yml** |

### Veredito (2026-08-13)

**PARCIALMENTE PRONTO — mas com risco crítico de segredo no histórico git.**

O código-fonte atual (HEAD) passa em todos os gates de CI (typecheck, build, testes, audit, secret scan). As correções críticas de 2026-08-04 (auth, RBAC, demo mode, CSP, mock data) permanecem válidas. Em 2026-08-13 foram corrigidas: vulnerabilidade de dependência (nanoid), healthcheck Docker, tenant blocking no webhook Asaas, cadastro aberto (agora invite-only) e otimização do Dockerfile.

**Restam bloqueantes para produção:**
1. **Git history purge** — a `SUPABASE_SERVICE_ROLE_KEY` e `VITE_SUPABASE_ANON_KEY` ainda estão em commits antigos de `docker-compose.prod.yml`. A chave deve ser rotacionada no painel Supabase e o histórico purgado com `git filter-repo`.
2. **CSP nonce** — `unsafe-inline`/`unsafe-eval` precisam de nonce para o `window.__ENV__` injection.
3. **localStorage clínico** — dados sensíveis persistidos sem criptografia (risco LGPD).
4. **Features incompletas** — upload de arquivos, WhatsApp (Evolution API), GPS check-in ainda são simulados.
5. **Testes de RLS** — 14 testes skipped (opt-in via `RUN_DB_TESTS=1 + SUPABASE_DB_URL`); E2E ausente.

---

## 🔴 CRÍTICO — bloqueia produção

### 1. Segredo de produção commitado no git (service role key)
`docker-compose.prod.yml` (linhas 11–12) contém em texto puro:
- `VITE_SUPABASE_ANON_KEY` (chave pública — ok expor, mas deve ir para secret)
- `SUPABASE_SERVICE_ROLE_KEY` (⚠️ chave de administrador — NUNCA deve ser pública)

O arquivo está no histórico git e já foi **enviado para `github.com/fluowai/homecarepro`**. Qualquer um com acesso ao repositório (ou vazamento) tem controle total do banco.

**Ação:** rotacionar a chave no painel Supabase IMEDIATAMENTE, remover a chave do arquivo e purgar o histórico git (filter-repo). O CI não detecta porque só procura o padrão `Argo@1507`.

### 2. Fallback de auth inseguro no cliente
`src/store.ts:710-713` — no `init()`, **qualquer erro** (perfil não encontrado, falha de RLS, erro de rede) cai em:
```
set({ isLoading: false, isAuthenticated: true, user: null, profile: null })
```
Ou seja: usuário SEM sessão válida entra no app em "demo mode" com dados de `localStorage`. Isso transforma um simples erro de banco em bypass de autenticação na UI.

**Ação:** em produção, erro de init deve mostrar tela de erro e NUNCA marcar como autenticado.

### 3. RBAC é client-side e o usuário pode trocar de role
- `src/components/Sidebar.tsx:194-205` — há um `<select>` "Nível de Acesso (RBAC)" que deixa QUALQUER usuário se definir como `mega_admin`/`super_admin`/`admin`. A role é lida de `localStorage` (`src/store.ts:608`).
- As telas admin (`SystemAdminView`, `ResellerView`, etc.) só checam `currentUserRole` no cliente.
- **Mitigação parcial:** o RLS do Supabase protege os dados por tenant, mas a *experiência* admin e dados globais dependem das policies. Isso precisa ser validado.

**Ação:** remover o role switcher; obter role do backend (supabase claims/metadata ou RPC) e validar acesso por rota server-side.

### 4. `typecheck` quebrado (CI falharia)
```
DEV/create-admin.ts(45,50): error TS2339: Property 'email' does not exist on type 'never'.
src/components/GlobalUserManager.tsx(68,14): error TS2304: Cannot find name 'Users'.
```
`GlobalUserManager.tsx` usa o ícone `Users` sem importá-lo (lucide-react). CI roda `npm run typecheck` → **o pipeline já estaria vermelho**.

### 5. Cadastro aberto sem convite
`AuthView.tsx` permite qualquer pessoa se registrar e se tornar `admin` do tenant `sp` (padrão). A elevação a "mega admin" é controlada por flag de `localStorage` (`homecare_pro_has_mega_admin`). Em produção, todo estranho pode abrir conta como admin de um tenant real.

**Ação:** decidir modelo (invite-only, aprovação manual, verificação de domínio) + confirmar se `signUp` exige e-mail confirmado.

---

## 🟠 ALTO

### 6. CSP enfraquecido
`app.ts:48-62` — `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`. `unsafe-inline` é necessário para o `window.__ENV__` injetado em `server.ts:87-91`. Em produção, migrar para nonce ou mover env para JSON estático.

### 7. Webhook Asaas — idempotência parcial
`app.ts:1007-1055` — ✅ token validado, ✅ anti-replay em memória (`processedWebhookIds`), ✅ tenant blocking **implementado** (2026-08-13).
- Pendente: assinatura HMAC (depende apenas de header de token); logs de auditoria completos.

### 8. Endpoints de IA — validação parcial
- ✅ Erros genéricos (sem `error.message` leak); ✅ 503 honesto sem `GEMINI_API_KEY`.
- ⏳ `express.json({ limit: "10mb" })` sem validação zod nos inputs de prompts.

### 9. Dados clínicos sensíveis em `localStorage`
`store.ts:794-808` — persiste pacientes, profissionais (CPF/registro), mensagens, medicamentos em `localStorage` como cache não criptografado. **Risco LGPD/ANVISA** (dados de saúde = sensíveis, Art. 5º II).

### 10. Features incompletas
- **Arquivos**: apenas metadados JSONB — não há upload real (sem Supabase Storage).
- **WhatsApp CRM** (`CommunicationView`): respostas via `setTimeout` fixo — sem Evolution API.
- **GPS check-in**: coordenadas randomizadas.
- **IA**: fallback rule-based removido (503 honesto). ✅

### 11. Migrations — runner operacional
`run-sql.js` ✅ com `schema_migrations`, execução transacional, modo `--baseline`.
- ⏳ Sem gate de produção no CI (não verifica versão aplicada antes do deploy).

### 12. SECURITY DEFINER com search_path ✅
`20260804000002_harden_rls_functions.sql` — ✅ `search_path=public` em `get_user_role`, `get_user_tenant_id`, `has_tenant_access`.

---

## 🟡 MÉDIO

### 13. CI
- ✅ `npm audit --audit-level=high` bloqueante (nanoid HIGH corrigida em 2026-08-13).
- ✅ Scan de JWT/service_role em arquivos tracked.
- ⏳ Bundle size: checagem usa glob `index-*.js` (ok).
- ⏳ Sem etapa de migration no CI.

### 14. Testes
- ✅ 64 testes unitários/servidor (55 server + 5 types + 4 store).
- ⏸️ 14 testes RLS skipped (opt-in via `RUN_DB_TESTS=1` + `SUPABASE_DB_URL`).
- ⏳ Sem testes E2E (Playwright configurado mas não implementado).
- ⏳ Sem testes de componentes.

### 15. Observabilidade
- ✅ Logger JSON estruturado, healthcheck.
- ⏳ Sem agregação (Loki/Datadog), tracing ou métricas.

### 16. Deploy/operacional
- ✅ Dockerfile otimizado (2026-08-13: copy+prune ao invés de `npm ci` duplicado).
- ✅ `docker-compose.prod.yml`: healthcheck reativado, 2 réplicas, restart policy, resource limits (2026-08-13).
- ✅ Docker CI: tag por SHA + latest (imutável via SHA) (2026-08-13).
- ⏳ Caddyfile: on-demand TLS genérico para qualquer hostname; fallback para tenant `system`.

### 17. Dependências
- ✅ `npm audit`: 0 vulnerabilidades (2026-08-13, após `npm audit fix`).
- ⚠️ Dois lockfiles: `bun.lock` + `package-lock.json` — risco de drift. CI usa `npm ci`.
- ✅ `nanoid 3.3.18`, `postcss 8.5.26` — atualizados.

### 18. LGPD
- ✅ Endpoints de export/delete com auth.
- ⏳ Export não inclui mensagens, visitas, leads, suporte.
- ⏳ Dados clínicos no localStorage (ver #9).
- ⏳ Sem registro formal de consentimento / RIPD.
Endpoints de export/delete existem (bom), mas:
- Export não inclui mensagens, visitas, leads, suporte.
- Sem registro formal de consentimento, sem relatório RIPD.
- Dados sensíveis de saúde no `localStorage` violam minimização (Art. 6º III).

---

## 🟢 O que já está correto (manter)
- ✅ RLS habilitado em todas as tabelas operacionais com política central `has_tenant_access`.
- ✅ Correção da recursão RLS (`get_user_role` SECURITY DEFINER com `search_path=public`).
- ✅ Helmet + CORS + rate limiters (global, auth, IA).
- ✅ Auth verificado server-side com service role (`requireAuth` → `supabase.auth.getUser`).
- ✅ Endpoints LGPD (exportar/excluir) com auth.
- ✅ Healthcheck `/api/health` público (endpoint ativo; Docker healthcheck reativado 2026-08-13).
- ✅ `.env` corretamente gitignored; `.env.example` trackado.
- ✅ Code-splitting por view (lazy) — bundle principal 716 KB / 197 KB gzip.
- ✅ Demo mode gateado por `VITE_ENABLE_DEMO_MODE` (default false).
- ✅ Role switcher removido; role vem do backend (`profile.role`).
- ✅ Webhook Asaas com idempotência anti-replay + tenant blocking.
- ✅ CSP básico via Helmet.
- ✅ `npm audit --audit-level=high` limpo (0 vulnerabilities).
- ✅ CI: typecheck + build + test + audit + secret scan todos bloqueantes.

---

## Plano de execução restante

**🔴 Imediato (requer ação externa — manual)**
1. **Rotacionar `SUPABASE_SERVICE_ROLE_KEY`** no painel Supabase — a chave antiga foi commitada e exposta.
2. **Purgar histórico git** com `git filter-repo` — remove a chave do `docker-compose.prod.yml` history. O CI não detecta porque só escaneia working tree.
3. **Invalidar `VITE_SUPABASE_ANON_KEY`** (também exposta no histórico).

**🔴 Imediato (code — faça antes do deploy)**
4. ✅ ~~Typecheck~~ resolvido.
5. ✅ ~~Role switcher~~ removido.
6. ✅ ~~Signup aberto~~ gateado por demo mode (2026-08-13).
7. ✅ ~~Webhook blocking~~ implementado (2026-08-13).
8. CSP nonce — migrar `window.__ENV__` inline injection para nonce ou JSON estático.
9. Zod validation em endpoints de IA (`transcribe`, `summarize-patient`, `suggest-schedule`, `generate-visit-report`, `triage`).
10. Supabase email confirmation: `ENABLE_EMAIL_CONFIRM=true` + flow de recuperação de senha.

**🟡 Curto prazo (produto + engenharia)**
11. Migrar cache clínico de `localStorage` → `sessionStorage` com expiração (LGPD).
12. Implementar upload real (Supabase Storage + RLS bucket) ou ocultar feature.
13. Evolution API para WhatsApp CRM ou marcar como "demo" (current).
14. Migrations gate no CI (verificar `schema_migrations` antes do deploy).
15. Testes RLS opt-in (`RUN_DB_TESTS=1` + `SUPABASE_DB_URL`) — validar em staging.
16. E2E Playwright: login → dashboard → fluxo crítico.
17. Backups testados + plano de restauração.
18. Observabilidade: agregação de logs, tracing, alertas.

## Arquivos-chave
- `server.ts` — bootstrap, env injection, Docker mode, shutdown
- `src/server/app.ts` — APIs, auth, rate limits, webhook, LGPD, CSP
- `src/store.ts` — lógica central (1623 linhas), demo mode, localStorage cache
- `src/components/AuthView.tsx` — login/signup (signup gateado por demo mode)
- `src/components/Sidebar.tsx` — navegação por role (badge somente leitura)
- `docker-compose.prod.yml` — deploy Docker Swarm/Traefik (healthcheck + limits)
- `Dockerfile` — multi-stage build (otimizado 2026-08-13)
- `.github/workflows/ci.yml` — quality gate + security scan
- `.github/workflows/docker.yml` — build/push (SHA + latest tags)
- `supabase/migrations/` — schema + RLS + billing + invitations
- `tests/server.test.ts` — 50 testes de endpoints
- `tests/rls.integration.test.ts` — 14 testes de isolamento (opt-in)
