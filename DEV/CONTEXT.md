# Contexto do Projeto

## Estado atual (2026-08-07)
SaaS multi-tenant de gestão de Home Care em fase pré-produção. Existe deploy Docker Swarm via Traefik apontando para `homecare.wootech.com.br`, mas o sistema NÃO está pronto para produção. Runner de migrations operacional (10 aplicadas / 0 pendentes). Onboarding de revendas e clínicas via convite por link (e-mail + senha) implementado e com testes.

## Decisões ativas
- Auth: Supabase Auth (email/senha), sem fluxo de recuperação de senha.
- Billing: Asaas (PIX/boleto), somente webhook básico, sem idempotência completa.
- IA: Gemini 2.5 Flash com fallback rule-based.
- Whitelabel: por domínio custom via Caddy On-Demand TLS + `/api/tenant/resolve`.
- Convites: revenda/clínica criados por Mega Admin/Super Admin; link copiável (`/?invite=token`), conta por e-mail + senha, expira em 7 dias.
- Dados: cache em `localStorage` (risco LGPD), modo demo sempre disponível.

## Pendências bloqueantes (resumo)
1. **Rotacionar service role key no Supabase** (a antiga foi commitada) + purgar histórico git.
2. **Decisão de cadastro** em produção (invite-only?) + confirmação de e-mail.
3. Features simuladas (arquivos, WhatsApp, GPS) ainda não são reais.
4. `npm audit`: 1 vulnerabilidade moderada (postcss) — não bloqueia.

## Corrigido em 2026-08-07
- Onboarding por convite (revenda/clínica): migration `tenant_invitations`, 4 endpoints, store, UI de aceite e link, painel exclusivo do Super Admin. Typecheck, 58 testes e build verdes.

## Corrigido em 2026-08-04
- Typecheck, build e testes verdes; smoke test de produção 200 OK.
- RBAC: role switcher removido; modo demo gateado; `init()` não autentica em erro.
- Segredos fora do `docker-compose.prod.yml`; fallback IA desabilitado em produção; webhook com idempotência; CI endurecido.
