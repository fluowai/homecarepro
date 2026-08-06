import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e@homecarepro.test';
export const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2e!Passw0rd-2026';
export const E2E_STATE_FILE = path.join(os.tmpdir(), 'homecare-e2e-user.json');

function adminHeaders(key: string): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function findUserByEmail(url: string, key: string, email: string) {
  const res = await fetch(`${url}/auth/v1/admin/users?page=1&perPage=200`, {
    headers: adminHeaders(key),
  });
  if (!res.ok) {
    throw new Error(`[E2E] listUsers falhou: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { users?: Array<{ id: string; email?: string | null }> };
  return body.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
}

export default async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      '[E2E] VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (defina no .env).',
    );
  }

  const stale = await findUserByEmail(url, key, E2E_EMAIL);
  if (stale) {
    await fetch(`${url}/auth/v1/admin/users/${stale.id}`, { method: 'DELETE', headers: adminHeaders(key) });
    console.log(`[E2E] removed stale user ${E2E_EMAIL}`);
  }

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Test User', tenant_id: 'sp', role: 'admin' },
    }),
  });

  if (!res.ok) {
    throw new Error(`[E2E] falha ao criar usuário de teste: ${res.status} ${await res.text()}`);
  }

  const created = (await res.json()) as { id: string };
  writeFileSync(E2E_STATE_FILE, JSON.stringify({ id: created.id, email: E2E_EMAIL }));
  console.log(`[E2E] usuário de teste provisionado: ${E2E_EMAIL}`);
}
