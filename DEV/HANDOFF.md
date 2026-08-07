# Handoff

## Próximo contexto
1. **Testar fluxo de convite ponta a ponta** no browser: mega admin cria revenda → copia link → logout → aceite (email+senha) → login automático como Super Admin → criar clínica filha com convite.
2. **Rotacionar a service role key no painel Supabase** (chave antiga foi commitada; purge do histórico git com filter-repo + force-push) — ação manual externa.
3. **Pendência de segurança**: `POST /api/invites/accept` e `GET /api/invites/:token` são públicos por design (convite é o token); avaliar revogação/limite de tentativas e monitoramento de abuso.
4. Decidir modelo de cadastro em produção (invite-only / aprovação manual) e configurar confirmação de e-mail no Supabase.
5. Implementar upload real de arquivos (Supabase Storage) ou ocultar a feature "Arquivos" — hoje é só metadata.
6. Substituir WhatsApp simulado por Evolution API ou marcar como "demo".
7. Adicionar testes de RLS/tenant isolation, endpoints e E2E.
8. Backups testados; observabilidade (agregação de logs).

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
