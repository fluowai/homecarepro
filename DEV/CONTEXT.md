# Contexto do Projeto

## Estado atual (2026-09-06)
SaaS multi-tenant de gestão de Home Care em fase **pré-produção com hardening aplicado**. Deploy Docker Swarm via Traefik em `homecare.wootech.com.br`. Onboarding por convite implementado e testado. **Super Admin por árvore + Whitelabel de e-mail implementados e APLICADOS no banco** (migrations 20/20 rastreadas; RLS por árvore ativo, vazamento global da 20260905 selado). Testes: 90 passed / 14 skipped (RLS opt-in) + **RLS 14/14 com `RUN_DB_TESTS=1`**. Typecheck **0 erros** e build verdes.

## Decisões ativas (2026-09-06)
- **Escopo de dados por árvore**: mega_admin = global; super_admin = própria revenda + clínicas filhas + equipes (RLS por árvore revertendo o vazamento da migration 20260905).
- **E-mails visíveis por nível**: campo `email` em `user_profiles`; leitura por árvore via `/api/admin/user-directory` (ex.: "E-mails da Rede").
- **Remetente por marca**: `sendInviteEmail` usa o remetente da revenda (Resend); config em WhitelabelConfig (`emailFromName/emailFromAddress/supportEmail`).
- Convites: revenda/clínica criados por Mega Admin/Super Admin; link copiável (`/?invite=token`), conta por e-mail + senha, expira em 7 dias.
- Cadastro: **invite-only em produção**.
- Dados: cache em `localStorage` (risco LGPD a mitigar — pendente 2026-09-06).

## Estado atual (2026-08-13)
SaaS multi-tenant de gestão de Home Care em fase **pré-produção com hardening aplicado**. Deploy Docker Swarm via Traefik em `homecare.wootech.com.br`. Runner de migrations: 13 aplicadas / 0 pendentes. Onboarding por convite implementado e testado. Dados mockados corrigidos. Hardening de segurança, CI, Docker e deploy aplicado (2026-08-13).

## Decisões ativas
- Auth: Supabase Auth (email/senha), sem fluxo de recuperação de senha.
- Billing: Asaas (PIX/boleto), webhook com idempotência + tenant blocking.
- IA: Gemini 2.5 Flash com 503 honesto sem `GEMINI_API_KEY`.
- Whitelabel: por domínio custom via Caddy On-Demand TLS + `/api/tenant/resolve`.
- Convites: revenda/clínica criados por Mega Admin/Super Admin; link copiável (`/?invite=token`), conta por e-mail + senha, expira em 7 dias.
- Cadastro: **invite-only em produção** (signup form só aparece em demo mode).
- Dados: cache em `localStorage` (risco LGPD a mitigar).

## Pendências bloqueantes
1. **🔴 Rotacionar service role key no Supabase + purgar histórico git** (chave antiga foi commitada em `docker-compose.prod.yml` history). Ação manual/externa. Em 2026-09-07 redigidos do git: service role JWT, anon key e senha do postgres (em `SUPABASE_DB_URL`) presentes em `portainer-stack-homecare-filled.yml` e `create_sc_saude.js` (agora lê do env). Rotação continua OBRIGATÓRIA (histórico git).
2. CSP nonce (unsafe-inline para `window.__ENV__`).
3. localStorage de dados clínicos (migrar para sessionStorage com expiração) — **pendente 2026-09-06**.
4. Features incompletas: upload de arquivos, WhatsMeow WhatsApp, GPS check-in.
5. Amostragem RLS: perseguir "same-tenant read" simulado; validar envio real de convite Resend com `.or()/.is()` (mock de testes não cobre), E2E e zod validation em endpoints de IA.
6. Configurar domínio de envio Resend por revenda (CNAME `send.<marca>`) — pré-requisito para remetente por marca em produção.


## Corrigido em 2026-09-07
- **Gate de segurança do CI (Security Scan)**: `npm audit --audit-level=high` falhava por highs do `xlsx` (sem fix, não usado pelo app) → removido das deps com stub `xlsx.d.ts` (audit 0 highs; restam 3 moderate aceitas — fix implicaria major do express). O check "hardcoded secrets" também **auto-casava o próprio `ci.yml`** (`*.yml`) e **encontrava segredos reais**: service role JWT (`create_sc_saude.js`, `portainer-stack-homecare-filled.yml`), anon key e **senha do postgres** em `portainer-stack-homecare-filled.yml` → redigidos/para env, check do postgres adicionado, `.github` excluído do scan.
- Gates locais: greps 0 matches, typecheck exit 0, 90 testes, build ok.

## Corrigido em 2026-08-09
- Dados mockados/simulados corrigidos: faturas persistidas no banco (migration `20260809120000_fix_invoices_schema.sql` aplicada), Dashboard/Finance/Admin/Cooperativa com métricas reais, IA sem conteúdo clínico simulado (503 honesto sem `GEMINI_API_KEY`), "Resolver" de alertas persistido, convites/planos/usuários internos reais. Typecheck, 64 testes e build verdes.

## Corrigido em 2026-08-07
- Onboarding por convite (revenda/clínica): migration `tenant_invitations`, 4 endpoints, store, UI de aceite e link, painel exclusivo do Super Admin. Typecheck, 58 testes e build verdes.

## Corrigido em 2026-08-04
- Typecheck, build e testes verdes; smoke test de produção 200 OK.
- RBAC: role switcher removido; modo demo gateado; `init()` não autentica em erro.
- Segredos fora do `docker-compose.prod.yml`; fallback IA desabilitado em produção; webhook com idempotência; CI endurecido.
