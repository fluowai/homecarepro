# Verificação

## Verificação 2026-09-09 — Isolamento de equipe e correção do usuário
| Item | Resultado |
|---|---|
| `sccuidadores2023@gmail.com` | ✅ `tenant_id` corrigido para `SC SAUDE`; associação antiga removida |
| Policies legadas `Tenant access` em negócio | ✅ removidas/reestruturadas sem acesso global para `super_admin` |
| `npm run typecheck` | ✅ passou |
| `npm test` | ✅ 94 passed / 14 skipped |
| `RUN_DB_TESTS=1 npm exec vitest -- run tests/rls.integration.test.ts` | ✅ 14/14 passed |

### Regra efetiva
Clínica lê apenas o próprio tenant; usuário com vínculo secundário lê somente os tenants explicitamente associados; super admin lê sua revenda e descendentes; mega admin permanece global.

## Verificação 2026-09-09 — Responsáveis do paciente e edição
| Item | Resultado |
|---|---|
| Campos de responsáveis | ✅ Nome e telefone, com múltiplos responsáveis e remoção individual |
| Persistência | ✅ Migration `20260909000000_add_patient_responsibles.sql` aplicada no Supabase |
| Botão Editar paciente | ✅ Modal abre diretamente na tela de detalhes, sem depender de Voltar |
| `npm run typecheck` | ✅ passou |
| `npm run build:frontend` | ✅ passou |
| `npm test` | ✅ suíte existente executada; testes RLS permanecem opt-in |

## Verificação 2026-09-08 — PWA obrigatório, profissionais e relatórios
| Item | Resultado |
|---|---|
| Acesso móvel fora do app instalado | ✅ `PWAInstallGate` bloqueia o sistema e orienta instalação Android/iOS |
| Edição de profissionais | ✅ formulário completo reutilizado; atualização chama `updateProfessional` e persiste via store |
| Relatórios profissionais | ✅ rota `reports`, filtros por profissional/período e CSV com visitas/valores reais |
| `npm run typecheck` | ✅ passou |
| `npm run build:frontend` | ✅ passou; service worker e manifest gerados |
| `npm test` | ✅ 90 passed / 14 skipped (RLS opt-in) |

### Risco residual
- A instalação não pode ser acionada programaticamente em todos os navegadores iOS; nesses casos o bloqueio mostra o procedimento manual do Safari.
- A validação visual em dispositivo físico e o teste autenticado ponta a ponta ainda dependem de uma sessão de staging/produção.

## Verificação 2026-09-08 — Push, service worker e MinIO
| Item | Resultado |
|---|---|
| VAPID key request | ✅ usa `/api/notifications/vapid-key` same-origin |
| Service worker | ✅ `navigateFallback` desativado; `dist/sw.js` sem `NavigationRoute` |
| MinIO endpoint | ✅ fallback não aponta para `localhost:9000` |
| `npm run lint` | ✅ passou |
| `npm run build:frontend` | ✅ passou |

## Verificação 2026-09-08 — CSP/Supabase build configuration
| Item | Resultado |
|---|---|
| `npm test` | ✅ 90 passed / 14 skipped |
| `npm run build` | ✅ Vite + esbuild + PWA generation passed |
| Production bundle URL check | ✅ real Supabase URL present; placeholder remains only as an unused fallback |
| Docker build paths | ✅ `Dockerfile` and `Dockerfile.frontend` preserve `.env.production` when build args are empty |

## Verificação 2026-09-07 — Security Scan CI verde (simulação local dos passos do job)
| Check | Resultado |
|---|---|
| `npm audit --audit-level=high` (sem xlsx) | ✅ exit 0 (3 moderate restantes, fix exigiria major do express) |
| grep JWT em ts/tsx/js/mjs/yml/yaml/json (exceto node_modules/dist/.git/.github) | ✅ 0 matches |
| grep `SUPABASE_SERVICE_ROLE_KEY=` (aspas incluídas) | ✅ 0 matches |
| grep `postgres(ql)://user:pass@` em yml/json | ✅ 0 matches |
| `.env` não trackeado | ✅ |
| typecheck / 90 testes / build | ✅ exit 0 |

## Última verificação (2026-09-06) — Aplicação de migrations + RLS + typecheck limpo

| Item | Comando | Resultado |
|---|---|---|
| Migrations aplicadas | `node run-sql.js` | ✅ 20/20 rastreadas (4 novas: whatsapp, homecare_improvements, 20260905, 20260906 + hardening 20260906000001) |
| RLS por árvore no banco | query pg_policies | ✅ `patients` = `tenant_id = get_user_tenant_id() OR has_tenant_tree_access(tenant_id)`; `user_profiles` por árvore; funções `get_tenant_tree_ids`/`has_tenant_tree_access` presentes |
| Colunas de marca | query information_schema | ✅ `tenants.email_from_name/email_from_address/support_email` |
| Testes RLS opt-in | `RUN_DB_TESTS=1 npx vitest run tests/rls.integration.test.ts` | ✅ **14/14 passed** (isolamento por tenant, mega global, super árvore, anon bloqueado) |
| Testes unitários | `npm test` | ✅ 90 passed / 14 skipped (RLS off por default) |
| Typecheck | `npm run typecheck` | ✅ **0 erros** (exit 0) — erros pré-existentes corrigidos: `mailer.ts` (await em builder), `app.ts` (render `{single:true}`→`maybeSingle()`), `sw.ts` (webworker typing), `AdminLayout` (import `Menu` conflitante), `upload.ts` (token da sessão), `vite.config.ts` (orientation/includeAssets/category) |
| Build | `npm run build` | ✅ `vite build` + esbuild OK |

### Correções no caminho
- **`20260822000000_add_whatsapp_tables.sql`**: corrigido `tenant_id uuid` → `text` (referenciava `tenants(id)` que é `text`); jamais havia sido aplicada.
- **Nova `20260906000001_harden_get_user_role_search_path.sql`**: a 20260905 redefiniu `get_user_role()` sem `SET search_path` (SECURITY DEFINER vulnerável a hijack); restaurado.
- **`tests/rls.integration.test.ts`**: expectativa "próprio perfil" atualizada — a policy intencional permite ler perfis do **mesmo tenant** (diretório de equipe/e-mails); segue bloqueando cross-tenant.
- **Vazamento crítico confirmado ATIVO** antes da correção: `patients` tinha `get_user_role() IN ('super_admin','mega_admin')` (20260905 aplicada manualmente, sem tracker).

## Última verificação (2026-09-06) — Super Admin por árvore + Whitelabel de e-mail

| Item | Comando | Resultado |
|---|---|---|
| Testes unitários | `npm test` | ✅ 90 passed, 0 failed, 14 skipped (RLS opt-in) |
| Typecheck (arquivos alterados) | `npm run typecheck` | ✅ 0 erros em app.ts/mailer.ts/store.ts/GlobalUserManager/NetworkDirectory/ResellerView/TenantEditorModal/WhitelabelConfig/Sidebar/App |
| Typecheck baseline | `npm run typecheck` (árvore limpa via stash) | ⚠️ Já falhava antes (erros pré-existentes em `mailer.ts` sendTemplatedEmail `.or/.is`, `app.ts` email-templates/render, `sw.ts`, `AdminLayout`, `upload.ts`, `vite.config.ts`) — não introduzidos por esta entrega |
| Migration RLS por árvore | revisão de `20260906000000_tree_scoped_superadmin.sql` | ✅ Nomes de policy batem com a 20260905; `DROP ... IF EXISTS`; SECURITY DEFINER com search_path |
| Dados por árvore (mega vs super) | revisão de `has_tenant_tree_access` | ✅ mega=global; super=própria árvore; demais roles sem acesso via função |

### ⚠️ Pendente pós-entrega
- **Aplicar migrations** `20260905` (se ainda não aplicada) e `20260906` no Supabase e rodar os testes RLS opt-in (`tests/rls.integration.test.ts`) para validar isolamento positivo/negativo.

## Última verificação (2026-08-13) — Hardening de produção

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ Sem erros |
| Build | `npm run build` | ✅ Bundle 716 KB (limite CI 1.5 MB); `dist/server.cjs` gerado |
| Testes unitários | `npx vitest run` | ✅ 64 passed, 14 skipped (RLS opt-in) |
| npm audit (high) | `npm audit --audit-level=high` | ✅ 0 vulnerabilidades (nanoid + postcss corrigidas) |
| Secret scan (CI) | `grep -rInE "eyJhbGci..."` | ✅ Nenhum JWT em arquivos tracked |
| .env tracked? | `git ls-files .env` | ✅ Não trackado |
| docker-compose.prod.yml | revisão | ✅ Usa `${VAR}`; healthcheck reativado; 2 réplicas; resource limits; restart policy |
| Dockerfile | revisão | ✅ Multi-stage otimizado (copy+prune vs npm ci duplicado) |
| CI docker tags | revisão | ✅ SHA + latest (imutável via SHA) |

## Última verificação (2026-08-09) — Correção de dados mockados/simulados

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | OK (sem erros) |
| Build | `npm run build` | OK (bundle + dist/server.cjs gerado) |
| Testes unitários | `npx vitest run` | 64 verdes / 14 skipped |
| Migration aplicada | `node run-sql.js` | 13 aplicadas / 0 pendentes |
| Schema verificado | `information_schema` | `invoices` (20 colunas, CHECK estendido, políticas RLS ok); `support_tickets` e `ticket_messages` existem com RLS ok |
| Fallback de IA dev | `tests/server.test.ts` | 503 honesto sem `GEMINI_API_KEY` (teste atualizado) |

## ⚠️ Pendente (requer ação externa)
- **Git history purge**: `SUPABASE_SERVICE_ROLE_KEY` + `VITE_SUPABASE_ANON_KEY` JWT values ainda presentes em commits antigos de `docker-compose.prod.yml`. Requer `git filter-repo` + rotação no painel Supabase.

## Última verificação (2026-08-07) — Convites de revenda e painel Super Admin

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | OK (sem erros) |
| Build | `npm run build` | OK (bundle principal ~717 KB; dist/server.cjs gerado) |
| Testes unitários | `npx vitest run` | 58 verdes (50 server incl. 15 novos de convites, 5 types, 4 store; 14 RLS skipped) |
| Migration aplicada | `node run-sql.js` | 10 aplicadas / 0 pendentes |
| Schema verificado | query `information_schema.columns` | `tenant_invitations` com 10 colunas corretas |
| Testes dos endpoints de convite | `npx vitest run tests/server.test.ts` | 50 verdes (401/403/400/404/410/409/201 cobertos) |

## Fluxo validado nos testes
- `POST /api/admin/tenants`: 401 sem token; 403 operador; 400 sem adminEmail/email inválido; mega_admin cria revenda (parentId null, role super_admin); super_admin cria clínica filha (parentId próprio, role admin).
- `POST /api/admin/tenants/:id/invite`: 403 super_admin sem ownership; 201 novo link; 400 sem adminEmail.
- `GET /api/invites/:token`: 404 inválido; 200 com tenant; 410 expirado.
- `POST /api/invites/accept`: 400 incompleto/senha curta; 201 cria conta e marca aceito; 409 e-mail já existente.

## Última verificação (2026-08-14) — Análise de schema SQL completo

| Item | Resultado |
|---|---|
| Migrations existentes | ✅ 13 arquivos em `supabase/migrations/` (ordem cronológica correta) |
| FULL_DATABASE_SCHEMA.sql | ✅ Concatenação atualizada de todas as 13 migrations |
| Tabelas definidas no SQL | ✅ 24 tabelas (tenants, user_profiles, user_tenants, patients, professionals, visits, leads, messages, medicines, surveys, survey_config, alert_config, health_insurances, subscriptions, invoices, saas_plans, support_tickets, ticket_messages, tenant_invitations, medication_administrations, proposals, contracts, assemblies, assembly_votes) |
| Tabelas referenciadas no código | ✅ Todas as 24 tabelas correspondem a referências no store.ts/app.ts/componentes |
| Functions SECURITY DEFINER | ✅ 3 funções (get_user_role, get_user_tenant_id, has_tenant_access) com `search_path=public` |
| Extensão `uuid-ossp` | ✅ Criada (fornece `uuid_generate_v4()` usada em support_tickets/ticket_messages) |
| Extensão `pgcrypto` | ❌ **AUSENTE** — `gen_random_uuid()` usada em billing + tenant_invitations sem a extensão criada |
| RLS em todas as tabelas | ✅ Todas têm RLS + policies |
| Trigger on_auth_user_created | ✅ Auto-cria user_profile + sync user_tenants |
| Run-sql.js | ✅ Transacional, tracking em schema_migrations, --baseline |
| `npm run typecheck` | ✅ Sem erros |
| `npm run build` | ✅ 716 KB (< 1.5 MB) |
| `npx vitest run` | ✅ 64 passed, 14 skipped |
| `npm audit --audit-level=high` | ✅ 0 vulnerabilidades |

### ⚠️ Issues para corrigir
1. **[CRÍTICO] `pgcrypto` extension faltando**: Adicionar `create extension if not exists "pgcrypto";` à migration inicial ou como uma migration separada (primeira a rodar). Sem isso, `node run-sql.js` falha em `20260729111700_add_billing_schema.sql` em DB limpo.
2. **[MÉDIO] `schema_migrations` sem RLS**: Adicionar `ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY; CREATE POLICY ... ON public.schema_migrations;` no run-sql.js após criar a tabela, ou incluir no runner. Evita falha no teste estrutural de RLS.
3. **[MÉDIO] Triggers `updated_at`**: Criar triggers para auto-atualizar `updated_at` em tabelas que têm essa coluna (invoices, subscriptions, contracts, proposals, support_tickets, patients, medicine_administrations, assemblies, assembly_votes).
4. **[BAIXO] `visitToRow` JSONB coords**: A função em store.ts passa coords como string `"lat,lng"` para colunas `jsonb`. Corrigir para passar objeto JSON `{lat, lng}` ou `{type:"Point",coordinates:[lng,lat]}`.
5. **[BAIXO] `assemblyVoteToRow` missing `tenant_id`**: Adicionar `tenant_id: get().activeTenantId` ao objeto retornado.
