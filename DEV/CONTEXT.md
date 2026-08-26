# Contexto do Projeto

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
1. **🔴 Rotacionar service role key no Supabase + purgar histórico git** (chave antiga foi commitada em `docker-compose.prod.yml` history). Ação manual/externa.
2. CSP nonce (unsafe-inline para `window.__ENV__`).
3. localStorage de dados clínicos (migrar para sessionStorage com expiração).
4. Features incompletas: upload de arquivos, Evolution API WhatsApp, GPS check-in.
5. Testes: RLS (opt-in), E2E, componentes, zod validation em endpoints de IA.


## Corrigido em 2026-08-09
- Dados mockados/simulados corrigidos: faturas persistidas no banco (migration `20260809120000_fix_invoices_schema.sql` aplicada), Dashboard/Finance/Admin/Cooperativa com métricas reais, IA sem conteúdo clínico simulado (503 honesto sem `GEMINI_API_KEY`), "Resolver" de alertas persistido, convites/planos/usuários internos reais. Typecheck, 64 testes e build verdes.

## Corrigido em 2026-08-07
- Onboarding por convite (revenda/clínica): migration `tenant_invitations`, 4 endpoints, store, UI de aceite e link, painel exclusivo do Super Admin. Typecheck, 58 testes e build verdes.

## Corrigido em 2026-08-04
- Typecheck, build e testes verdes; smoke test de produção 200 OK.
- RBAC: role switcher removido; modo demo gateado; `init()` não autentica em erro.
- Segredos fora do `docker-compose.prod.yml`; fallback IA desabilitado em produção; webhook com idempotência; CI endurecido.
