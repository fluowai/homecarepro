import { readFileSync } from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const STATE_FILE = path.join(os.tmpdir(), 'homecare-e2e-user.json');

export default async function globalTeardown() {
  let userId: string | undefined;
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as { id?: string };
    userId = state.id;
  } catch {
    return;
  }

  const url = process.env.VITE_SUPABASE_URL?.replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!userId || !url || !key) return;

  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    console.error(`[E2E] falha ao remover usuário de teste: ${res.status} ${await res.text()}`);
    return;
  }
  console.log(`[E2E] usuário de teste removido: ${userId}`);
}
