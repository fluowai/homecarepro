# DEV — Índice do Projeto (HomeCare Pro)

Mapa da documentação operacional. Leia na ordem abaixo.

## Compactos (leia primeiro)
- `HANDOFF.md` — estado atual e próximo contexto
- `CONTEXT.md` — estado do projeto / decisões ativas
- `SPECS/ACTIVE.md` — contrato da tarefa em andamento
- `VERIFY.md` — evidência de verificação da última entrega

## Detalhe
- `PRODUCTION_READINESS.md` — análise completa de prontidão para produção (2026-08-04)
- `WORKLOG.md` — histórico compacto de trabalho
- `create-admin.ts` — script auxiliar de criação de admin (quebrado: TS error)
- `apply.js` — script auxiliar

## Referências externas
- Stack: React 19 + Vite 6 + TS + Express (Node 22) + Supabase (Postgres + RLS + Auth) + Docker/Traefik/GHCR
- Migrations: `supabase/migrations/`
- CI: `.github/workflows/ci.yml` e `docker.yml`
