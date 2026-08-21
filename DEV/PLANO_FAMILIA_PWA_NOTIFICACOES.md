# Plano de Implementação — Nível Família, PWA e Notificações com Áudio

## Contexto Analisado

Projeto: **HomeCare Pro** — SaaS multi-tenant (React 19 + Vite 6 + Express + Supabase + Docker/Traefik).

Domínio: `homecare.wootech.com.br` (subdomain multitenancy já implementado em 2026-08-19).

---

## 1. Nível Família (Family Role)

### Situação Atual
- **Roles definidos no DB** (`user_profiles.role` CHECK): `mega_admin`, `super_admin`, `admin`, `operator`, `professional`, `patient`, `viewer`, `system_support`.
- O role **`patient`** é reaproveitado como "família": `FamilyDashboardView` (App.tsx:149) é renderizado quando `currentUserRole === 'patient'` e faz matching por e-mail entre `patients.email` e `user.email` (FamilyDashboardView.tsx:9-13).
- **Nenhuma relação explícita** entre familiar e paciente (não há tabela de vínculo).
- O Sidebar.tsx:55 referencia `auditor` e `system_support` no `roleLabels`, mas `auditor` **não existe no CHECK constraint do DB** — inconsistência.

### Problema
O vínculo por e-mail é frágil: se o e-mail do paciente mudar ou o familiar usar outro e-mail, perde o acesso. Não há controle granular de quais pacientes o familiar vê, nem convite formal.

### Proposta

#### 1.1 Nova Migration
- **Nova coluna/migration**: `role = 'family'` no CHECK constraint de `user_profiles`.
- **Nova tabela**: `patient_family_links` — vinculo N:N entre `user_profiles(id)` e `patients(id)`, com `tenant_id`, `relationship` (ex: "filho", "cônjuge", "responsável legal"), `is_primary`, `created_by`, `created_at`.
- RLS: policies restringem leitura/escrita por tenant (regras de família só veem seus pacientes vinculados).

#### 1.2 Backend (server/app.ts)
- Endpoint `POST /api/patient-family-links` (admin/professional vincula familiar a paciente via e-mail do familiar → envia convite ou cria link).
- Endpoint `GET /api/patient-family-links/mine` (family role lista pacientes vinculados).
- O convite de família reaproveita o fluxo existente de `tenant_invitations` (role=`family`, expira em 7 dias).

#### 1.3 Frontend
- **Types** (`src/types.ts`): adicionar `'family'` ao `UserRole`; nova interface `PatientFamilyLink`.
- **Store** (`src/store.ts`): carregar `patient_family_links` no `init()`; para role `family`, filtrar `patients`/`visits`/mensagens apenas pelos pacientes vinculados.
- **App.tsx**: renderizar `FamilyDashboardView` para role `family` (mesmo que `patient` hoje), mas baseado no vínculo explícito.
- **FamilyDashboardView**: substituir o matching por e-mail por lookup via `patient_family_links`. Expor apenas dados do(s) paciente(s) vinculado(s).
- **Sidebar.tsx**: adicionar `'family'` às roles com acesso; criar grupo de navegação "Minha Saúde" (dashboard do paciente, agendamento, mensagens, medicamentos).
- **Topbar.tsx**: para role `family`, restringir notificações ao paciente vinculado.

#### 1.4 Admin UI
- Em `PatientsView` → aba nova "Família": admin lista/convida familiares vinculados ao paciente (e-mail → invite link).

---

## 2. PWA — Ícone na Tela Inicial sem App

### Situação Atual
- `public/manifest.json` existe com `"display": "standalone"`, `"start_url": "/"`, mas o **único ícone é `/vite.svg` (SVG)**.
- Nenhum **Service Worker** registrado → não é PWA instalável, não tem `beforeinstallprompt`, não funciona offline.

### Proposta

#### 2.1 Service Worker (Vite PWA plugin)
- Instalar `vite-plugin-pwa` (compatível com Vite 6).
- Registro automático do SW via plugin.
- `src/sw.ts`: cache de assets estáticos; estratégia `CacheFirst` para assets, `StaleWhileRevalidate` para API Supabase.

#### 2.2 Ícones PWA
- Gerar PNG icons: **192x192** e **512x512** a partir do logo atual (ou usar `assets/`).
- Atualizar `manifest.json`: `icons` array completo (192/512 PNG), `name`, `short_name`, `theme_color`, `background_color`, `display: "standalone"`, `scope: "/"`.
- Adicionar `apple-touch-icon` no `index.html` para iOS.

#### 2.3 Install Prompt
- Capturar `beforeinstallprompt` event em `main.tsx` / componente `PWAInstallBanner`.
- Botão visível "Adicionar à Tela Inicial" (only shows when prompt disponível).

#### 2.4 Offline Support
- SW cacheia roteamento SPA (fallback para `index.html`).
- Mensagens e dados já em `sessionStorage` (store) funcionam offline; alertar usuario quando offline (CheckInView já tem lógica de offline → expandir).

---

## 3. Notificações com Áudio para Todos os Níveis

### Situação Atual
- Notificações apenas **in-app** (Topbar dropdown: visitas em andamento, alertas clínicos, mensagens não lidas).
- `AlertsView` tem checkbox `enableSystemNotifications` salvo no `alert_config` mas **nunca usado**.
- Sem Web Push, sem áudio, sem realtime.

### Proposta

#### 3.1 Push Notifications (Web Push API + Supabase Realtime)
- **Backend**: endpoint `POST /api/notifications` — cria notificação no DB (`notifications` table: `id, tenant_id, user_id, patient_id, title, body, type, severity, is_read, audio_url, created_at`).
- **Supabase Realtime**: subscribe `postgres_changes` no canal `notifications` filtrado por `tenant_id` e `user_id`. Conexões server-side enviam push via VAPID.
- **VAPID keys**: gerar `PUBLIC_VAPID_KEY` / `PRIVATE_VAPID_KEY`; usar biblioteca `web-push` no Express server.
- **Push subscription**: salvar `endpoint + keys` no perfil do usuário (coluna `push_subscription` JSON em `user_profiles` ou tabela separada `push_subscriptions`).
- **Supabase Edge Function**: opcional para offload do envio push, mas pode ser feito no Express existente (server/app.ts).

#### 3.2 Áudio
- Para cada notificação crítica (alerta crítico, visita em andamento, mensagem urgente): tocar áudio.
- `audio/` assets: `alert-critical.mp3`, `alert-warning.mp3`, `message.mp3`, `visit-start.mp3`.
- `lib/notifications.ts`: função `playNotificationSound(type)` usando `Audio` API; fallback para `speechSynthesis` (texto→fala) quando áudio falhar.
- Volume control no store (preference `notificationAudioEnabled`, `notificationVolume`).

#### 3.3 Integração por Role
- **Todos os níveis** recebem notificações, mas filtradas:
  - `family`: apenas do paciente vinculado (visita em andamento, alerta clínico crítico).
  - `admin`/`operator`/`professional`: alertas do tenant, novas mensagens, check-ins.
  - `super_admin`/`mega_admin`: alertas críticos da rede + novos tenants criados.
- **Trigger points** no store: `checkInVisit` → notifica família; `getCalculatedAlerts` → notifica admin/profissional; `receiveMessage` → notifica.

#### 3.4 UI de Preferências
- Em `AlertsView` → aba "Notificações" (expandir da aba existente "settings"):
  - Toggles por tipo: visitas, alertas clínicos, mensagens, crítico somente.
  - Toggle áudio.
  - Preview de áudio.
  - Testar notificação (botão).

---

## 4. Cronograma por Fases

| Fase | Duração | Entregas |
|------|---------|----------|
| **F1** — Família (DB + backend) | 1 dia | Migration `patient_family_links`, CHECK `family`, endpoints API, RLS policies, testes RLS |
| **F2** — Família (frontend) | 2 dias | Types, Store, FamilyDashboardView (vínculo explícito), Sidabar, Topbar, PatientsView "Família", convite de familiar |
| **F3** — PWA | 1 dia | vite-plugin-pwa, service worker, ícones PNG, index.html apple-touch, install prompt, cache offline |
| **F4** — Notificações push + áudio | 3-4 dias | `notifications` table, VAPID, web-push, endpoint save subscription, Supabase Realtime, `sw.ts` push handler, áudio assets, `lib/notifications.ts`, UI preferências, trigger points store |
| **F5** — Verificação | 1 dia | `npm run typecheck`, `npx vitest run`, `npm run build`, teste PWA installable, teste push no mobile |

### Total estimado: ~8-10 dias de desenvolvimento

---

## 5. Decisão Técnlica: "Power alguma coisa"

O usuário mencionou "power alguma coisa" como tecnologia para notificações. Dadas as opções compatíveis com a stack atual:

| Tecnolgia | Vantagem | Aderência |
|-----------|----------|-----------|
| **Firebase Cloud Messaging (FCM)** | Supabase oferece integração nativa; SDKs maduros; delivery confiável em iOS/Android/Desktop browsers | ★★★★★ |
| **OneSignal** | UI de gerenciamento pronto; webhooks; mas vendor lock-in | ★★★☆☆ |
| **Web Push API (pura, VAPID)** | Zero dependência externa; open source | ★★★★☆ |

**Recomendação**: Usar **FCM via Supabase Functions** ou **Web Push puro com `web-push`** no Express existente. A implementação com `web-push` + VAPID é mais leve e não requer dependência externa (custo zero, mantém o projeto autoscaling no Docker atual). FCM é recomendado se houver necessidade de delivery em background real (app fechado), mas para PWA no navegador, Web Push API é suficiente.

