# Handoff

## Próximo contexto
1. **Rotacionar a service role key no painel Supabase** (chave antiga foi commitada; purge do histórico git com filter-repo + force-push) — ação manual externa.
2. Decidir modelo de cadastro em produção (invite-only / aprovação manual) e configurar confirmação de e-mail no Supabase.
3. Implementar upload real de arquivos (Supabase Storage) ou ocultar a feature "Arquivos" — hoje é só metadata.
4. Substituir WhatsApp simulado por Evolution API ou marcar como "demo".
5. Adicionar testes de RLS/tenant isolation, endpoints e E2E.
6. Backups testados; observabilidade (agregação de logs).

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
