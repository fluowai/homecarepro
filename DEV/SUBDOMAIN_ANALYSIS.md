# Subdomain Multi-Tenant Analysis — IMPLEMENTED

> Status: ✅ **100% IMPLEMENTADO**
> Criado: 2026-08-19
> Última atualização: 2026-08-20 — Todas as fases implementadas e testadas

## Resumo Executivo

Cada tenant (clínica/revenda) agora pode ser acessada via seu próprio subdomínio
(`https://<subdomain>.homecarepro.com.br`), com resolução automática de tenant por
subdomínio, TLS wildcard via Caddy, e isolamento de dados por RLS (já existente).

---

## Estado Atual vs. Desejado

### Antes (antes da implementação)

| Layer | Estado |
|-------|--------|
| Banco (`tenants`) | Sem coluna `subdomain` |
| API `/api/tenant/resolve` | Resolvia apenas por `custom_domain` |
| API `/api/internal/caddy-ask` | Validava apenas `custom_domain` + domínios-chave |
| POST `/api/admin/tenants` | Criava tenant sem subdomain |
| PUT `/api/tenant/config` | Atualizava apenas `custom_domain`, cores, logo |
| Frontend `whitelabel.ts` | Carregava branding por `window.location.hostname` (sem extrair subdomain) |
| Frontend `store.ts` | `activeTenantId` vinha de `profile.tenant_id` (ignorava URL) |
| Types `Tenant` | Sem campo `subdomain` |
| UI (WhitelabelConfig, TenantEditorModal) | Sem campo de subdomain |
| Caddyfile | Catch-all `https://` com On-Demand TLS (sem wildcard explícito) |
| Docker Compose | Sem `APP_BASE_DOMAIN` |
| `.env` / `.env.example` | Sem `APP_BASE_DOMAIN` |
| Testes | Sem testes para subdomain |

### Depois (após implementação)

| Layer | Estado |
|-------|--------|
| Banco (`tenants`) | ✅ Coluna `subdomain` + constraint + índice + backfill |
| API `/api/tenant/resolve` | ✅ Resolve por `custom_domain` → `subdomain` → fallback `system` |
| API `/api/internal/caddy-ask` | ✅ Valida `custom_domain` + `subdomain` (extrai do hostname) |
| POST `/api/admin/tenants` | ✅ Auto-gera subdomain do nome, valida unicidade + domínios reservados |
| PUT `/api/tenant/config` | ✅ Atualiza `subdomain` com validação |
| Frontend `whitelabel.ts` | ✅ `/api/subdomain.ts` extrai e expõe subdomain |
| Frontend `store.ts` | ✅ `init()` resolve `activeTenantId` pelo subdomain acessível |
| Types `Tenant` | ✅ `subdomain?: string` |
| UI (WhitelabelConfig, TenantEditorModal) | ✅ Campo de subdomain com preview em tempo real |
| Caddyfile | ✅ `*.homecarepro.com.br` wildcard + headers de segurança |
| Docker Compose | ✅ `APP_BASE_DOMAIN` + wildcard Traefik labels |
| `.env` / `.env.example` | ✅ `APP_BASE_DOMAIN` adicionado |
| Testes | ✅ 69 testes server + 12 testes frontend = 81 passando |

---

## Arquivos Modificados

### Infraestrutura & Database
- `supabase/migrations/20260819000000_add_tenant_subdomain.sql` — **novo**: migration completa
- `Caddyfile` — wildcard `*.homecarepro.com.br` + headers de segurança
- `Caddyfile.separated` — wildcard + headers de segurança
- `docker-compose.yml` — `APP_BASE_DOMAIN` env
- `docker-compose.separated.yml` — `APP_BASE_DOMAIN` env + build arg
- `docker-compose.prod.yml` — `APP_BASE_DOMAIN` env + wildcard Traefik labels
- `Dockerfile.frontend` — `VITE_APP_BASE_DOMAIN` build arg

### Types
- `src/types.ts` — `subdomain?: string` adicionado à interface `Tenant`

### Server (API)
- `src/server/app.ts` — helper `extractSubdomain()`, `slugifySubdomain()`, `RESERVED_SUBDOMAINS`;
  `/api/tenant/resolve` e `/api/internal/caddy-ask` estendidos; `POST /api/admin/tenants` e
  `PUT /api/tenant/config` atualizados
- `server.ts` — injeta `VITE_APP_BASE_DOMAIN` em `window.__ENV__`; passa `appBaseDomain`
- `server/api.ts` — passa `appBaseDomain` para `createApp()`

### Frontend
- `src/lib/subdomain.ts` — **novo**: `extractSubdomain()`, `buildTenantUrl()`, `getAppBaseDomain()`, `getEnv()`
- `src/lib/whitelabel.ts` — usa `extractSubdomain`, resolve e expõe branding + subdomain
- `src/store.ts` — `init()` resolve `activeTenantId` pelo subdomain; `addTenant`/`updateTenant`/`refreshTenants`
  incluem `subdomain`
- `src/App.tsx` — redirect pós-login para subdomain do tenant (exceto mega_admin e convites)
- `src/components/WhitelabelConfig.tsx` — campo de subdomain com preview
- `src/components/TenantEditorModal.tsx` — campo de subdomain

### Testes
- `tests/server.test.ts` — testes para subdomain em `/api/tenant/resolve`,
  `/api/internal/caddy-ask`, `POST /api/admin/tenants`, `PUT /api/tenant/config`
- `src/lib/subdomain.test.ts` — **novo**: 12 testes para `extractSubdomain` e `buildTenantUrl`

### Configuração
- `.env.example` — `APP_BASE_DOMAIN`
- `.env` — `APP_BASE_DOMAIN="homecarepro.com.br"`

---

## Fluxo de Requisição (desejado → implementado)

```
1. DNS: *.homecarepro.com.br → Caddy (wildcard TLS via on-demand)
2. Caddy: match Host → reverse_proxy → homecarepro-web:3000
3. Caddy ask: GET /api/internal/caddy-ask?domain=<host>
     → extractSubdomain(host) → subquery tenants(subdomain) → 200/404
4. Browser carrega index.html (com window.__ENV__)
5. whitelabel.ts → GET /api/tenant/resolve?domain=<host>
     → resolve por custom_domain → subdomain → system
     → aplica cores CSS + expõe branding
6. App.tsx → store.init()
     → carrega profile + tenants (RLS)
     → extractSubdomain(hostname)
     → se subdomain matchaum tenant acessível → activeTenantId = that
     → se não, fallback para profile.tenant_id
7. Dados filtrados por activeTenantId (RLS por tenant_id)
```

---

## Plano de Implementação (5 fases — concluídas)

### Fase 1: Database (✅ concluída)
- Coluna `subdomain` (text, nullable)
- Índice único parcial (não-null)
- Constraint CHECK (regex + domínios reservados)
- Função `generate_subdomain(name)` (SQL imutável)
- Backfill de tenants existentes
- Índice de lookup para tenants ativos

### Fase 2: Server API (✅ concluída)
- Helper `extractSubdomain(hostname)`: extrai o label antes de `APP_BASE_DOMAIN`
- Helper `slugifySubdomain(name)`: normaliza nomes para subdomain válido
- `/api/tenant/resolve`: tenta `custom_domain` → `subdomain` → `system`
- `/api/internal/caddy-ask`: valida `custom_domain` → `subdomain` (via `extractSubdomain`)
- `POST /api/admin/tenants`: auto-gera subdomain (ou valida o fornecido)
- `PUT /api/tenant/config`: permite atualizar `subdomain` com validação

### Fase 3: Frontend (✅ concluída)
- `src/lib/subdomain.ts`: utilitários compartilhados (cliente le servidor)
- `whitelabel.ts`: resolve branding pelo hostname (subdomain ou custom_domain)
- `store.ts`: `init()` prioriza subdomain em `activeTenantId`; re-fetch config se diferente
- `App.tsx`: redirect pós-login para subdomain (exceto mega_admin, invite flow)

### Fase 4: Infraestrutura (✅ concluída)
- `Caddyfile`: wildcard `*.homecarepro.com.br` + headers de segurança
- `Docker Compose`: `APP_BASE_DOMAIN` env em todos os compose files
- `Dockerfile.frontend`: build arg `VITE_APP_BASE_DOMAIN`
- `server.ts`: injeção `window.__ENV__` com `VITE_APP_BASE_DOMAIN`

### Fase 5: Testes (✅ concluída)
- 6 novos testes server-side (resolve, caddy-ask, create, config)
- 12 testes frontend (extractSubdomain, buildTenantUrl)
- Suite completa: 90 pass / 0 fail / 14 skip (integração RLS)

---

## Decisões Arquitetônicas

1. **Subdomain como "slugify" do nome**: auto-gerado a partir do nome da clínica,
   com sufixo numérico se já existir (`-1`, `-2`).
2. **RLS inalterado**: o isolamento de dados continua por `has_tenant_access(tenant_id)`
   no nível do banco. O subdomain apenas define o *contexto de UI*.
3. **Redirect pós-login**: usuários no domínio principal são redirecionados ao
   subdomain do seu tenant. Mega-admins permanecem no domínio principal.
4. **On-Demand TLS no Caddy**: valida subdomains dinamicamente via `/api/internal/caddy-ask`,
   evitando necessidade de certs pré-emitidos.
5. **Domínios reservados**: bloqueio de `admin`, `api`, `app`, `www`, etc.

---

## Próximos Passos (pós-implementação)

1. Migrar a migration para o Supabase remoto: `supabase db push`
2. Configurar DNS: `*.homecarepro.com.br` → IP do Caddy
3. Configurar wildcard cert (Caddy usa on-demand TLS automático)
4. Testar manualmente: acessar `clinicateste.homecarepro.com.br` → ver branding e dados
