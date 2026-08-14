# Verificação

## Última verificação (2026-08-13) — Hardening de produção

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ Sem erros |
| Build | `npm run build` | ✅ Bundle 716 KB (limite CI 1.5 MB); `dist/server.cjs` gerado |
| Testes unitários | `npx vitest run` | ✅ 64 passed, 14 skipped (RLS opt-in) |
| npm audit (high) | `npm audit --audit-level=high` | ✅ 0 vulnerabilidades (nanoid + postcss corrigidas) |
| Secret scan (CI) | `grep -rInE "eyJhbGci..."` | ✅ Nenhum JWT em arquivos tracked |
| .env tracked? | `git ls-files .env` | ✅ Não trackado |
| docker-compose.prod.yml | revisão | ✅ Usa `${VAR}`; healthcheck reativado; 2 réplicas; resource limits; restart policy |
| Dockerfile | revisão | ✅ Multi-stage otimizado (copy+prune vs npm ci duplicado) |
| CI docker tags | revisão | ✅ SHA + latest (imutável via SHA) |

## Última verificação (2026-08-09) — Correção de dados mockados/simulados

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | OK (sem erros) |
| Build | `npm run build` | OK (bundle + dist/server.cjs gerado) |
| Testes unitários | `npx vitest run` | 64 verdes / 14 skipped |
| Migration aplicada | `node run-sql.js` | 13 aplicadas / 0 pendentes |
| Schema verificado | `information_schema` | `invoices` (20 colunas, CHECK estendido, políticas RLS ok); `support_tickets` e `ticket_messages` existem com RLS ok |
| Fallback de IA dev | `tests/server.test.ts` | 503 honesto sem `GEMINI_API_KEY` (teste atualizado) |

## ⚠️ Pendente (requer ação externa)
- **Git history purge**: `SUPABASE_SERVICE_ROLE_KEY` + `VITE_SUPABASE_ANON_KEY` JWT values ainda presentes em commits antigos de `docker-compose.prod.yml`. Requer `git filter-repo` + rotação no painel Supabase.

## Última verificação (2026-08-07) — Convites de revenda e painel Super Admin

| Item | Comando | Resultado |
|---|---|---|
| Typecheck | `npm run typecheck` | OK (sem erros) |
| Build | `npm run build` | OK (bundle principal ~717 KB; dist/server.cjs gerado) |
| Testes unitários | `npx vitest run` | 58 verdes (50 server incl. 15 novos de convites, 5 types, 4 store; 14 RLS skipped) |
| Migration aplicada | `node run-sql.js` | 10 aplicadas / 0 pendentes |
| Schema verificado | query `information_schema.columns` | `tenant_invitations` com 10 colunas corretas |
| Testes dos endpoints de convite | `npx vitest run tests/server.test.ts` | 50 verdes (401/403/400/404/410/409/201 cobertos) |

## Fluxo validado nos testes
- `POST /api/admin/tenants`: 401 sem token; 403 operador; 400 sem adminEmail/email inválido; mega_admin cria revenda (parentId null, role super_admin); super_admin cria clínica filha (parentId próprio, role admin).
- `POST /api/admin/tenants/:id/invite`: 403 super_admin sem ownership; 201 novo link; 400 sem adminEmail.
- `GET /api/invites/:token`: 404 inválido; 200 com tenant; 410 expirado.
- `POST /api/invites/accept`: 400 incompleto/senha curta; 201 cria conta e marca aceito; 409 e-mail já existente.
