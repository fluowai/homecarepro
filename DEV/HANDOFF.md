# Handoff

## 2026-09-09 — Responsáveis do paciente e editor
- `PatientsView` agora permite cadastrar, editar, adicionar e remover responsáveis com nome e telefone.
- `Patient`/store persistem `responsibles` como JSONB em `patients`.
- Migration `20260909000000_add_patient_responsibles.sql` aplicada pelo `run-sql.js`.
- O modal foi movido para fora do ramo condicional da lista; Editar abre diretamente na tela de detalhes.

## 2026-09-08 — WhatsMeow no lugar do provedor anterior
- Criado `whatsmeow-service` em Go com uma sessão persistida por instância, QR Code, reconexão e envio de texto.
- Rotas Node `/api/whatsapp/*` agora usam somente o serviço WhatsMeow; containers e variáveis do provedor anterior foram removidos.
- O Docker CLI não estava disponível para validar `docker compose config`; o build Go e o typecheck local passaram.
- Produção: configurar `WHATSMEOW_API_KEY` e `WHATSMEOW_WEBHOOK_KEY` no Portainer e fazer deploy da imagem gerada pelo GitHub Actions.

## 2026-09-08 — Próximo contexto: PWA, profissionais e relatórios
- Implementado bloqueio de uso móvel fora do PWA instalado em `src/components/PWAInstallGate.tsx`.
- Implementada edição completa de profissionais em `src/components/ProfessionalsView.tsx`.
- Implementado `src/components/ReportsView.tsx` e roteamento `reports` no `src/App.tsx`.
- Verificações verdes: typecheck, build frontend e 90 testes unitários/servidor; 14 testes RLS permanecem opt-in.
- Validar em dispositivo físico Android/iOS: instalação, retorno ao app, login e exportação do relatório.

## 2026-09-08 — Erros pós-deploy corrigidos
- Rebuild/redeploy necessário para publicar: VAPID same-origin, service worker sem fallback para HTML não precacheado e endpoint MinIO público.
- No Portainer/Swarm, configurar `MINIO_ENDPOINT` público (ou `MINIO_PUBLIC_ENDPOINT`) e as credenciais `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY`; o fallback público evita `localhost`, mas não substitui credenciais válidas.

## 2026-09-08 — CSP/Supabase build fix
- `Dockerfile` and `Dockerfile.frontend` now preserve `.env.production` when optional `VITE_*` build args are empty; rebuild and redeploy the image to replace the old bundle that used `placeholder.supabase.co`.

## Próximo contexto (2026-09-06 final — migrations aplicadas, RLS 14/14, typecheck limpo)
1. **Validar no browser** o fluxo ponta a ponta: mega cria revenda → convite → aceite → login Super Admin → cria clínica → "E-mails da Rede" mostra apenas a própria árvore.
2. Configurar domínio de envio no Resend por revenda (seção "E-mail da Marca" no WhitelabelConfig) — CNAME `send.<marca>` → `getAppBaseDomain()`.
3. Migrar `localStorage` de dados clínicos → `sessionStorage` com expiração (LGPD) — pendências antigas do CONTEXT.
4. Refatorar `sendTemplatedEmail`/render com escopo por tipo+tenant se necessário; validar envio real de convite com marca (mock de testes não tem `.or()/.is()`).
5. Confirmar convite com remetente da marca em produção (Resend) e backfill de e-mail em `user_profiles` (já aplicado pela 20260905).

## Próximo contexto (2026-09-06 — Super Admin árvore + Whitelabel e-mail)
1. **Aplicar no Supabase** a migration `20260906000000_tree_scoped_superadmin.sql` (e confirmar/ó aplicar a `20260905000000_superadmin_and_email.sql` antes). Depois rodar `tests/rls.integration.test.ts` (RLS opt-in) validando isolamento positivo/negativo. → **FEITO**: migrações aplicadas (20/20), RLS 14/14.
2. Configurar domínio de envio no Resend por revenda (ver seção "E-mail da Marca" no WhitelabelConfig) — CNAME `send.marcadarevenda.com` → `getAppBaseDomain()`.
3. Validar no browser: mega cria revenda → convite → aceite → login Super Admin → cria clínica → "E-mails da Rede" mostra apenas a própria árvore.
4. Migrar `localStorage` de dados clínicos → `sessionStorage` com expiração (LGPD).
5. Corrigir erros de typecheck **pré-existentes** (`mailer.ts` sendTemplatedEmail `.or/.is/.order/.single`, `app.ts` email-templates/render, `sw.ts`, `AdminLayout` `Menu` conflict, `upload.ts` token, `vite.config.ts` orientation) — não foram introduzidos por esta entrega.
6. Confirmar trigger `handle_new_user` da 20260905 + backfill de e-mail em `user_profiles`.

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
# Handoff — 2026-09-09

## Última entrega
- Corrigido o usuário `sccuidadores2023@gmail.com` para `SC SAUDE` no banco de produção.
- Endurecido o isolamento da tela de equipe e das policies RLS, preservando somente acessos autorizados por tenant, vínculo secundário e árvore de revenda.
- Migrations aplicadas e testes RLS reais aprovados.

## Próximo cuidado operacional
- Após deploy do frontend, pedir logout/login ou limpar a sessão do navegador para descartar `activeTenantId` antigo em `localStorage`.
