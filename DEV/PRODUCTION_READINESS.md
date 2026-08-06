# Prontidão para Produção — Análise Completa (2026-08-04)

Relatório executado via orquestrador. Sistema: **HomeCare Pro** — SaaS multi-tenant de gestão de home care (React 19 + Vite + Express + Supabase + Docker/Traefik).

## Status das correções (atualizado em 2026-08-04, fase de execução)

| Item | Status |
|---|---|
| #1 Segredo no docker-compose.prod.yml | ✅ Chaves substituídas por `${VAR}` (resta **rotacionar no Supabase + purgar histórico git** — manual) |
| #2 Fallback demo/init autentica em erro | ✅ Corrigido (`store.ts`) |
| #3 Role switcher client-side | ✅ Removido (badge somente leitura) |
| #4 Typecheck quebrado | ✅ Corrigido (2 erros) |
| #5 Cadastro aberto / flag localStorage | ✅ Flag removida (resta **decisão de produto** invite-only) |
| #8 Erros de IA vazados | ✅ Genéricos; fallback IA desabilitado em produção |
| #7 Webhook Asaas idempotência | ✅ Anti-replay em memória (resta assinatura/bloqueio de inadimplente) |
| #12 SECURITY DEFINER sem search_path | ✅ Migration `20260804000002_harden_rls_functions.sql` |
| #13/#14 CI fraco | ✅ Audit bloqueante + scan JWT/service_role + vitest run |
| #6 CSP unsafe-inline/eval | ⏳ Pendente (requer nonce para envScript) |
| #9 localStorage de dados clínicos | ⏳ Pendente |
| #10 Features simuladas (arquivos/WhatsApp/GPS/IA) | ⏳ Pendente (decisões de produto) |
| #11 Migrations sem tracking | ⏳ Pendente |

## Veredito

**NÃO está pronto para produção.** Existe uma boa base (RLS, rate limits, CSP, healthcheck, LGPD), mas há **1 segredo crítico exposto**, **controles de acesso frágeis**, **features simuladas** e **testes insuficientes**.

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
`server.ts:45` — `scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`. `unsafe-inline` é necessário para o `window.__ENV__` injetado no `index.html`. Em produção recomenda-se nonce ou mover env para um JSON estático, removendo `unsafe-inline`/`unsafe-eval`.

### 7. Webhook Asaas sem idempotência/robustez
`server.ts:635-673` — valida token (bom), mas:
- Não registra `payment.id` processado → replay pode aplicar updates duplicados.
- Não há verificação de assinatura HMAC (depende apenas de header).
- `PAYMENT_OVERDUE` NÃO bloqueia o tenant (código comentado) — cliente inadimplente continua usando.
- Sem logs estruturados completos de erro com dados de auditoria.

### 8. Endpoints de IA expõem erros e aceitam payloads não validados
- `res.status(500).json({ error: error.message })` vaza detalhes internos (Google SDK, etc.) ao cliente.
- `/api/gemini/transcribe` aceita `audioData` base64 sem limite de tamanho explícito além do `10mb` do express.json.
- Inputs de prompts (`summarize-patient`, `suggest-schedule`) não são validados com zod.

### 9. Dados clínicos sensíveis em `localStorage`
`store.ts` persiste pacientes (diagnósticos, alergias, medicamentos, timeline), profissionais (CPF, registro) e mensagens em `localStorage` como cache. Isso é um **risco LGPD/privacidade** (dados de saúde = dados sensíveis, Art. 5º II LGPD) e fica em disco do navegador.

### 10. Features simuladas apresentadas como reais
- **Arquivos de pacientes**: apenas metadados JSONB — **não há upload real** (sem Supabase Storage). O "Arquivos" não armazena nada.
- **WhatsApp CRM** (`CommunicationView`): respostas do paciente são `setTimeout` com texto fixo — não há integração Evolution API/WhatsApp.
- **GPS check-in**: coordenadas randomizadas.
- **IA**: fallback rule-based se `GEMINI_API_KEY` ausente — em produção com chave vazia, o sistema gera respostas clínicas "simuladas" que parecem reais. **Perigoso em contexto de saúde.**

### 11. Migrations sem tracking seguro
`run-sql.js` roda **todos** os arquivos em toda execução. As seeds usam `ON CONFLICT DO NOTHING` (ok), mas o schema mestre (`20260727140000_full_system_schema.sql`) faz `DROP POLICY` e recria tudo — sem verificação de estado. Falta tabela de versão aplicada e gate de produção.

### 12. `get_user_role()` SECURITY DEFINER sem `search_path` fixo
`20260804000001_fix_rls_recursion.sql:6-9` — boa correção da recursão, mas a função `SECURITY DEFINER` não define `search_path`, padrão recomendado para evitar hijack de schema.

---

## 🟡 MÉDIO

### 13. CI fraco
- `npm audit` roda com `continue-on-error: true` → não bloqueia vulnerabilidades.
- Checagem de bundle usa caminho fixo `dist/assets/index-*.js`.
- Sem etapa de migração/verificação do schema.
- `npm test -- --run` no CI funciona, mas testes são triviais (9 testes de constantes).

### 14. Testes insuficientes
Sem testes de RLS/tenant isolation, de endpoints (`server.ts`), de webhook, de auth, de componentes nem E2E.

### 15. Logging/observabilidade
Há logger JSON estruturado (bom), mas sem agregação (ELK/Loki/Datadog), sem tracing e sem métricas. `unhandledRejection` só loga (não derruba) — ok, mas sem alerta.

### 16. Deploy/operacional
- Dockerfile faz `npm ci` no build e no estágio prod (duplicado, lento).
- `docker-compose.prod.yml`: 1 réplica, sem `restart` policy, sem resource limits.
- Healthcheck foi **removido** (commit 4a358b4) — sem sinal de vida/readiness para o orquestrador.
- Caddyfile faz on-demand TLS para qualquer hostname; `/api/tenant/resolve` cai para o tenant `system` quando não há custom_domain — branding errado para domínios não mapeados.
- Imagem docker: `ghcr.io/fluowai/homecarepro:latest` usa tag `latest` fixa (sem versionamento imutável).

### 17. Dependências
- `npm audit`: 1 vulnerabilidade moderada (postcss ≤8.5.22).
- Dois lockfiles (`bun.lock` e `package-lock.json`) — risco de drift.

### 18. LGPD incompleto na prática
Endpoints de export/delete existem (bom), mas:
- Export não inclui mensagens, visitas, leads, suporte.
- Sem registro formal de consentimento, sem relatório RIPD.
- Dados sensíveis de saúde no `localStorage` violam minimização (Art. 6º III).

---

## 🟢 O que já está correto (manter)
- RLS habilitado em todas as tabelas operacionais com política central `has_tenant_access`.
- Correção da recursão RLS (`get_user_role` SECURITY DEFINER).
- Helmet + CORS allowlist + rate limiters (global, auth, IA).
- Auth verificado server-side com service role (`requireAuth` → `supabase.auth.getUser`).
- Endpoints LGPD (exportar/excluir) com auth.
- Healthcheck `/api/health` público.
- `.env` corretamente gitignored.
- Code-splitting por view (lazy) já ativo — bundle principal 703 KB / 197 KB gzip.

---

## Plano sugerido de execução (próxima fase)

**Blocker (dia 1)**
1. Rotacionar service role key + remover do git/histórico.
2. Corrigir typecheck (2 erros).
3. Remover role switcher e fallback demo em produção.
4. Gate de produção: `VITE_ENABLE_DEMO_MODE=false` por padrão.

**Sprint de segurança (semana 1)**
5. Validar RLS com testes positivos/negativos por role e tenant (skill-supabase-rls).
6. Endurecer webhook Asaas (idempotência, assinatura, bloqueio de inadimplente).
7. Validação zod nos endpoints + erro genérico (sem `error.message`).
8. CSP com nonce; remover `unsafe-eval` quando viável.

**Sprint de produto (semana 2)**
9. Decidir cadastro (invite-only) + confirmação de e-mail.
10. Implementar upload real de arquivos (Supabase Storage + RLS de bucket) ou ocultar feature.
11. Substituir WhatsApp simulado por Evolution API (skill-evolution-api) ou marcar como "demo".
12. Mover cache clínico de `localStorage` para memória/sessionStorage com expiração.

**Sprint de operação (semana 2–3)**
13. Backups do Supabase com teste de restauração + plano de recuperação.
14. Migrations com tabela de versão + gate em CI.
15. Observabilidade (agregação de logs + alertas de erro).
16. Healthcheck + readiness no Swarm, resource limits, tags de imagem imutáveis.
17. Cobertura de testes: RLS, endpoints, webhook, E2E de login→dashboard.

## Arquivos-chave
- `server.ts` — APIs, auth, rate limits, webhook, LGPD
- `src/store.ts` — lógica central (1297 linhas), modo demo, localStorage
- `src/components/AuthView.tsx` — cadastro aberto + flag localStorage
- `src/components/Sidebar.tsx` — role switcher client-side
- `docker-compose.prod.yml` — SEGREDO EXPOSTO
- `supabase/migrations/` — schema + RLS
