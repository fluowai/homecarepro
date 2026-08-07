# Verificação

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
