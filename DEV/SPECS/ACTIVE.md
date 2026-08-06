# Spec Ativa — Análise de Prontidão para Produção

## Objetivo
Analisar o sistema HomeCare Pro e levantar tudo o que falta para ir a produção.

## Status
**Concluída a análise** (2026-08-04). Nenhuma alteração de código executada nesta fase.

## Entregável
- `DEV/PRODUCTION_READINESS.md` — relatório completo com prioridades.
- Resumo executivo entregue ao maestro no chat.

## Aceite (para próxima fase de implementação)
1. Chaves rotacionadas e segredo removido do histórico git.
2. `typecheck` verde no CI.
3. Modo demo desabilitado em produção (flag `VITE_ENABLE_DEMO_MODE`).
4. Auth sem fallback inseguro.
5. RBAC real (server-side) para telas administrativas.
6. Testes de RLS/tenant isolation criados.
