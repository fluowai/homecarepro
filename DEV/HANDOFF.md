# Handoff

## 🔴 Imediato — ação external (bloqueia produção)
1. **Rotacionar `SUPABASE_SERVICE_ROLE_KEY`** no painel Supabase. A chave antiga foi commitada em `docker-compose.prod.yml` e ainda está no histórico git.
2. **Purgar histórico git** com `git filter-repo` para remover a chave e o anon key do histórico. O CI secret scan só verifica working tree, não history.
3. **Invalidar `VITE_SUPABASE_ANON_KEY`** (também exposta no histórico).

## Próximo contexto
1. Validar no browser os fluxos reais (já corrigidos de mocks).
2. Testar fluxo de convite ponta a ponta: mega admin cria revenda → link → aceite → login como Super Admin → clínica filha.
3. CSP nonce migration (server.ts env injection → nonce ou JSON estático).
4. Migrar localStorage → sessionStorage com expiração (LGPD).
5. Supabase email confirmation + password reset.
6. Zod validation em endpoints de IA.
7. Testes RLS (opt-in), E2E, componentes.

## Correção de mocks e simulações (implementado 2026-08-09)
- Todos os KPIs/elementos fake removidos ou computados de dados reais; faturas persistidas; IA sem fallback de conteúdo clínico simulado.
- Migration `20260809120000_fix_invoices_schema.sql` aplicada (13 aplicadas / 0 pendentes).
- Validações: typecheck OK, `npx vitest run` (64 verdes), `npm run build` OK.

## Convites de revenda (implementado 2026-08-07)
- Migration `20260807000000_add_tenant_invitations.sql` aplicada (10 aplicadas / 0 pendentes).
- Endpoints de convite no `src/server/app.ts`; store com `createTenantWithInvite`/`regenerateInvite`; UI de aceite (`/?invite=token`).
- Validações: typecheck, `npx vitest run` (58 verdes), `npm run build` verdes.

## Runner de migrations (implementado 2026-08-04)
- `node run-sql.js` → aplica apenas migrations pendentes (transacional), registrando em `public.schema_migrations`.
- `node run-sql.js --baseline` → registra as migrations atuais como aplicadas sem executar (usar ao adotar o runner em banco já migrado).
- Estado atual do banco: 9 aplicadas / 0 pendentes.

## Corrigido em 2026-08-04 (verificado)
- Typecheck verde; build verde; 9 testes verdes; smoke test de produção 200 OK.
- Role switcher removido (RBAC client-side); modo demo gateado (`VITE_ENABLE_DEMO_MODE`); `init()` não autentica em erro.
- Segredos removidos do `docker-compose.prod.yml` (agora `${VAR}`); fallback IA desabilitado em produção; webhook com idempotência.
- CI endurecido (audit bloqueante + scan de JWT/service_role).

## O que já foi verificado (2026-08-04)
- `npm run typecheck`: OK.
- `npm run build`: OK (bundle principal ~702 KB).
- `npx vitest run`: 9 testes passam.
- `npm audit --audit-level=high`: OK (1 vulnerabilidade moderada postcss — não bloqueia).
