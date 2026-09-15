# Spec Ativa — Contratos com serviços e escala automática (2026-09-10)

## Objetivo
Permitir que a clínica cadastre serviços dentro de contratos, defina o valor fixo do plantão do profissional e gere automaticamente os próximos 30 dias de escala ao vincular o profissional.

## Decisões
- O valor do profissional é fixo por serviço/plantão; não há cálculo por comissão.
- O plantão grava os valores no momento da geração para preservar o histórico.
- A geração considera dias da semana, horário e vigência do contrato.
- A geração é idempotente e não duplica plantões existentes.
- A migration é expand-only; os contratos e plantões legados continuam válidos.

## Escopo implementado
1. `ContractService` com serviço, especialidade, dias da semana, horário, valor da clínica, valor do profissional e vínculo do profissional.
2. Contrato com descrição operacional da escala e serviços persistidos em JSONB.
3. Plantões com contrato/serviço de origem, valor da clínica e indicação de geração automática.
4. Tela de contratos com cadastro de serviços e geração automática de 30 dias.
5. Migration `20260910000000_contract_services_and_auto_schedule.sql`.

## Pós-deploy
- Aplicar a migration no Supabase antes de usar o novo formulário em produção.
- Validar no browser a criação de contrato, vínculo do profissional e escala gerada.
- Confirmar regras específicas de feriados, trocas e renovação futura de períodos.

---

# Spec anterior — Super Admin por árvore + Whitelabel de e-mail (2026-09-06)

## Objetivo
Corrigir o vazamento RLS introduzido pela migration `20260905000000_superadmin_and_email.sql` (todo super_admin via dados de saúde/e-mails de todas as revendas) e implementar: Super Admin vê e-mails da própria árvore (revenda → clínicas → equipes) e remetente de e-mail por marca da revenda (Resend).

## Decisões do maestro (2026-09-06)
1. Prioridade: **Segurança + Whitelabel** primeiro (cooperativas ficam no roadmap).
2. E-mails: **escopados por árvore** (mega_admin global; super_admin só a própria árvore).
3. Remetente por revenda: **Sim** (Resend, domínio verificado por marca).

## Escopo
1. Migration `20260906000000_tree_scoped_superadmin.sql`: colunas de e-mail em `tenants`; índices; `get_tenant_tree_ids()` + `has_tenant_tree_access()` (SECURITY DEFINER); RLS por árvore nas tabelas de negócio, `tenants` e `user_profiles` (substitui o escopo global da 20260905).
2. Backend (`app.ts`): `PUT /api/tenant/config` com `emailFrom*`; `POST /api/admin/tenants` com `tenantType` + validação de domínio; `GET/PUT /api/admin/tenants/:id`; `GET /api/admin/user-directory`; convite com marca.
3. Mailer: `resolveBrandSender()` em `sendInviteEmail`.
4. UI: `WhitelabelConfig` (E-mail da Marca), `TenantEditorModal` (`secondaryColor`, `updateAdminTenant`), `GlobalUserManager` reescrito, novo `NetworkDirectory` + seção/menu "E-mails da Rede".
5. Store: `updateAdminTenant`.

## Status
**Código concluído** (2026-09-06) — migration pronta; **aplicação no Supabase pendente**. Testes: 90 passed / 14 skipped. Nenhum erro novo de typecheck (erros pré-existentes fora do escopo, ver HANDOFF).

## Aceite
1. `npm test`: 90+ passed, 0 failed.
2. Typecheck sem erros novos nos arquivos alterados (baseline já falhava).
3. Migration `20260906` revisada (policies batem com 20260905; idempotente).
4. **Pendente pós-deploy**: aplicar migrations no Supabase + rodar `tests/rls.integration.test.ts` (isolamento positivo/negativo).

---
# Specs anteriores (concluídas)

## Spec — Correção de dados mockados/simulados (cadastro real)

## Objetivo
"Valide cada função se tiver dado mockup corrija... quero cadastrar dados reais": eliminar elementos simulados e fazer as telas operarem com dados reais persistidos no banco (financeiro, dashboard, administração, cooperativa, alertas, convites, IA).

## Escopo
1. `store.ts`: auth em todos os fetches de IA (`aiFetch`), fallbacks honestos, RBAC sem localStorage, estado/actions de `invoices` persistidos, `resolvedAlertIds` persistido.
2. Migration `20260809120000_fix_invoices_schema.sql` (reconciliação da tabela `invoices` com schema do app) — aplicada.
3. Views reescritas para dados reais: FinanceView, DashboardView, FamilyDashboardView, AssembliesView, Topbar, CrmView (lead→paciente+contrato), ContractsView, InternalTeamManager, PlanManager, SystemAdminView, ResellerView, CoopFinanceView, SatisfactionView, AlertsView, GlobalUserManager, SupportDesk.
4. `server/app.ts`: endpoints `POST/DELETE /api/admin/users` (mega_admin, convite em tenant `system`); fallbacks de IA em dev retornam 503 honesto.

## Status
**Concluído** (2026-08-09) — code, migration aplicada, testes (64), typecheck e build verdes.

## Aceite
1. `npm run typecheck`: verde.
2. `npx vitest run`: 64 testes verdes (14 skipped RLS).
3. `npm run build`: verde.
4. Migration `20260809120000_fix_invoices_schema.sql` aplicada (13 aplicadas / 0 pendentes); `invoices`, `support_tickets` e `ticket_messages` verificados no banco.
5. Fallback de IA em dev: 503 honesto sem `GEMINI_API_KEY` (teste atualizado).

---
## Spec anterior — Convites de Revenda e Painel Super Admin (Whitelabel, concluído 2026-08-07)

## Objetivo
Permitir que o Mega Admin crie revendas (whitelabel) e que o Super Admin gerencie clínicas clientes, com criação de conta via link de convite (e-mail + senha) e painel exclusivo para o Super Admin.

## Decisões do maestro (2026-08-07)
- Entrega do convite: **somente link copiável** (sem envio de e-mail automático).
- Criação de conta: **e-mail + senha** (não magic link).
- Painel do Super Admin: **visão geral + gestão de clínicas** + configuração whitelabel.

## Escopo
1. Tabela `tenant_invitations` + RLS + função `generate_invite_token()` (migration).
2. Endpoints: `POST /api/admin/tenants`, `POST /api/admin/tenants/:id/invite`, `GET /api/invites/:token`, `POST /api/invites/accept`.
3. Store: `refreshTenants`, `createTenantWithInvite`, `regenerateInvite`; `init()` carrega tenants do Supabase.
4. UI: `InviteAcceptView` (aceite público), `InviteLinkModal` (link copiável), `TenantEditorModal` (criação com email do admin), `SystemAdminView` (botão reenvio de convite), `ResellerView` (painel exclusivo do Super Admin), `App.tsx` (rota `/?invite=`).

## Regras de negócio
- Mega Admin cria revenda (sem `parentId` → role `super_admin`). Com `parentId` → role `admin`.
- Super Admin cria/convida clínicas apenas sob o próprio tenant (`parent_id = tenant_id` do super admin).
- Convite expira em 7 dias (`INVITE_TTL_MS`); token = `crypto.randomBytes(32).hex`.
- Aceite cria usuário via `auth.admin.createUser` com `email_confirm: true` e auto-login.

## Status
**Concluído** (2026-08-07) — code, migration aplicada, testes, typecheck e build verdes.

## Aceite
1. `npm run typecheck`: verde.
2. `npx vitest run`: 58 testes, todos passando (50 server + 5 types + 4 store; 14 RLS skip).
3. `npm run build`: verde.
4. Migration `20260807000000_add_tenant_invitations.sql` aplicada (10 aplicadas / 0 pendentes) e tabela verificada no banco.
