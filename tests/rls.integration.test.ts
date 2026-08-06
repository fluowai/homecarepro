// ============================================================================
// RLS / tenant isolation integration tests.
//
// OPT-IN: roda somente quando `SUPABASE_DB_URL` está definida E
// `RUN_DB_TESTS=1`. Caso contrário, toda a suíte é ignorada.
//
// SEGURANÇA: nenhum dado é persistido. Fixtures são criadas com o papel
// superuser (que ignora RLS) e todo teste executa dentro de transação com
// ROLLBACK. Cada cenário simula um usuário autenticado via:
//   SET LOCAL ROLE <anon|authenticated>;
//   SELECT set_config('request.jwt.claims', '{"sub":"<uuid>"}', true);
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.SUPABASE_DB_URL;
const RUN = process.env.RUN_DB_TESTS === "1";
const dbEnabled = Boolean(DB_URL && RUN);

const pool = dbEnabled ? new pg.Pool({ connectionString: DB_URL, max: 4 }) : null;

// ── Fixture constants ───────────────────────────────────────────
const TENANT_A = "rt-a";
const TENANT_B = "rt-b";
const TENANT_C = "rt-c"; // child of TENANT_A

const USER_A = "10000000-0000-0000-0000-000000000001"; // operator @ rt-a
const USER_B = "10000000-0000-0000-0000-000000000002"; // operator @ rt-b
const USER_C = "10000000-0000-0000-0000-000000000003"; // super_admin @ rt-a
const USER_MEGA = "10000000-0000-0000-0000-000000000004"; // mega_admin @ system
const USER_D = "10000000-0000-0000-0000-000000000005"; // operator @ rt-a, secondary rt-b

const PATIENT_A = "rt-patient-a";
const PATIENT_B = "rt-patient-b";
const PATIENT_C = "rt-patient-c";

const claims = (sub: string) => JSON.stringify({ sub, role: "authenticated" });

// ── Helpers ─────────────────────────────────────────────────────
async function runAs(
  client: pg.PoolClient,
  role: "anon" | "authenticated",
  sub: string | null,
  fn: () => Promise<void>,
) {
  await client.query("BEGIN");
  try {
    if (role) {
      await client.query(`SET LOCAL ROLE ${role}`);
    }
    if (sub) {
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [claims(sub)]);
    }
    await fn();
  } finally {
    await client.query("ROLLBACK");
  }
}

async function selectAs(
  role: "anon" | "authenticated",
  sub: string | null,
  sql: string,
  params: unknown[] = [],
): Promise<unknown[]> {
  const client = await pool!.connect();
  try {
    let rows: unknown[] = [];
    await runAs(client, role, sub, async () => {
      const res = await client.query(sql, params);
      rows = res.rows;
    });
    return rows;
  } finally {
    client.release();
  }
}

async function tryWrite(
  role: "authenticated",
  sub: string,
  sql: string,
  params: unknown[] = [],
): Promise<{ ok: boolean; rowCount: number; error?: string }> {
  const client = await pool!.connect();
  try {
    let rowCount = 0;
    let writeError: string | undefined;
    await runAs(client, role, sub, async () => {
      try {
        const res = await client.query(sql, params);
        rowCount = res.rowCount ?? 0;
      } catch (err: any) {
        writeError = err.message;
      }
    });
    return { ok: writeError === undefined, rowCount, error: writeError };
  } finally {
    client.release();
  }
}

const ids = (rows: unknown[], col = "id"): string[] =>
  rows.map((r) => (r as Record<string, string>)[col]);

// ── Fixture setup/teardown (superuser, RLS bypassed) ────────────
async function insertUser(client: pg.PoolClient, id: string, email: string, tenantId: string, role: string) {
  await client.query(
    `INSERT INTO auth.users
      (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
     VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '',
             now(), '{"provider":"email","providers":["email"]}'::jsonb, $3::jsonb, now(), now())
     ON CONFLICT (id) DO NOTHING`,
    [id, email, JSON.stringify({ tenant_id: tenantId, role })],
  );
}

async function createFixtures(client: pg.PoolClient) {
  // Tenants (parent_id hierarchy: rt-c is child of rt-a)
  await client.query(
    `INSERT INTO public.tenants (id, name, cnpj, plan, status, parent_id) VALUES
       ($1, 'RLS Test Tenant A', '11.111.111/0001-11', 'Basic', 'active', NULL),
       ($2, 'RLS Test Tenant B', '22.222.222/0001-22', 'Basic', 'active', NULL),
       ($3, 'RLS Test Child C', '33.333.333/0001-33', 'Basic', 'active', $1)
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_A, TENANT_B, TENANT_C],
  );

  // Users (the on_auth_user_created trigger creates user_profiles + sync trigger fills user_tenants)
  await insertUser(client, USER_A, "rlstest-a@homecarepro.test", TENANT_A, "operator");
  await insertUser(client, USER_B, "rlstest-b@homecarepro.test", TENANT_B, "operator");
  await insertUser(client, USER_C, "rlstest-c@homecarepro.test", TENANT_A, "super_admin");
  await insertUser(client, USER_MEGA, "rlstest-mega@homecarepro.test", "system", "mega_admin");
  await insertUser(client, USER_D, "rlstest-d@homecarepro.test", TENANT_A, "operator");

  // Secondary tenant access for user D
  await client.query(
    `INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES ($1, $2, 'operator')
     ON CONFLICT (user_id, tenant_id) DO NOTHING`,
    [USER_D, TENANT_B],
  );

  // Patients
  await client.query(
    `INSERT INTO public.patients (id, tenant_id, name, status) VALUES
       ($1, $2, 'Paciente Tenant A', 'active'),
       ($3, $4, 'Paciente Tenant B', 'active'),
       ($5, $6, 'Paciente Tenant C', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [PATIENT_A, TENANT_A, PATIENT_B, TENANT_B, PATIENT_C, TENANT_C],
  );
}

async function dropFixtures(client: pg.PoolClient) {
  await client.query("DELETE FROM public.tenants WHERE id IN ($1, $2, $3)", [TENANT_A, TENANT_B, TENANT_C]);
  await client.query("DELETE FROM auth.users WHERE email LIKE 'rlstest-%@homecarepro.test'");
}

beforeAll(async () => {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await createFixtures(client);
  } finally {
    client.release();
  }
});

afterAll(async () => {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await dropFixtures(client);
  } catch (err) {
    console.error("[RLS test] cleanup failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
});

// ── Structural checks ───────────────────────────────────────────
describe.skipIf(!dbEnabled)("RLS: estrutura e hardening", () => {
  it("habilita RLS em todas as tabelas do schema public", async () => {
    const { rows } = await pool!.query(
      `SELECT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY c.relname`,
    );
    const names = rows.map((r) => r.relname);
    expect(names.length).toBeGreaterThan(0);

    const { rows: unsecured } = await pool!.query(
      `SELECT c.relname
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
       ORDER BY c.relname`,
    );
    expect(unsecured.map((r) => r.relname)).toEqual([]);
  });

  it("possui policies nas tabelas de dados", async () => {
    const required = ["tenants", "user_profiles", "user_tenants", "health_insurances", "patients", "professionals", "visits", "leads", "messages", "medicines", "surveys", "survey_config", "alert_config"];
    const { rows } = await pool!.query(
      `SELECT tablename, count(*)::int AS n
       FROM pg_policies
       WHERE schemaname = 'public'
       GROUP BY tablename`,
    );
    const counts = Object.fromEntries(rows.map((r) => [r.tablename, r.n]));
    for (const table of required) {
      expect(counts[table] ?? 0, `sem policies em ${table}`).toBeGreaterThan(0);
    }
  });

  it("fixa search_path nas funções SECURITY DEFINER usadas por RLS", async () => {
    const { rows } = await pool!.query(
      `SELECT p.proname, p.proconfig
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN ('get_user_role', 'get_user_tenant_id', 'has_tenant_access')`,
    );
    expect(rows.length).toBe(3);
    for (const r of rows) {
      expect(r.proconfig ?? [], `search_path ausente em ${r.proname}`).toContain("search_path=public");
    }
  });
});

// ── Access scenarios ────────────────────────────────────────────
describe.skipIf(!dbEnabled)("RLS: isolamento por tenant", () => {
  it("anon não enxerga pacientes nem perfis", async () => {
    const patients = await selectAs("anon", null, "SELECT id FROM public.patients");
    const profiles = await selectAs("anon", null, "SELECT id FROM public.user_profiles");
    const access = await selectAs("anon", null, "SELECT public.has_tenant_access($1) AS ok", [TENANT_A]);

    expect(patients).toHaveLength(0);
    expect(profiles).toHaveLength(0);
    expect((access[0] as { ok: boolean }).ok).toBe(false);
  });

  it("operador lê apenas pacientes do próprio tenant (bloqueio cross-tenant)", async () => {
    const rows = await selectAs("authenticated", USER_A, "SELECT id FROM public.patients ORDER BY id");
    const result = ids(rows);
    expect(result).toContain(PATIENT_A);
    expect(result).not.toContain(PATIENT_B);
    expect(result).not.toContain(PATIENT_C);
  });

  it("operador lê apenas rows de tenants acessíveis (próprio + filho, nunca irmão)", async () => {
    const rows = await selectAs("authenticated", USER_A, "SELECT id FROM public.tenants ORDER BY id");
    const result = ids(rows);
    expect(result).toContain(TENANT_A);
    expect(result).toContain(TENANT_C); // child is exposed by the OR-parent policy
    expect(result).not.toContain(TENANT_B);
  });

  it("usuário lê apenas o próprio perfil", async () => {
    const rows = await selectAs("authenticated", USER_A, "SELECT id FROM public.user_profiles");
    const result = ids(rows);
    expect(result).toEqual([USER_A]);
    expect(result).not.toContain(USER_B);
  });

  it("operador não consegue atualizar perfil de outro usuário", async () => {
    const { ok, rowCount } = await tryWrite(
      "authenticated",
      USER_A,
      "UPDATE public.user_profiles SET full_name = 'Hack' WHERE id = $1",
      [USER_B],
    );
    expect(ok).toBe(true);
    expect(rowCount).toBe(0);
  });

  it("operador não consegue inserir paciente em outro tenant (WITH CHECK)", async () => {
    const { ok, error } = await tryWrite(
      "authenticated",
      USER_A,
      "INSERT INTO public.patients (id, tenant_id, name) VALUES ('rt-hack', $1, 'Hack')",
      [TENANT_B],
    );
    expect(ok).toBe(false);
    expect(error).toMatch(/row-level security/i);
  });

  it("operador consegue inserir paciente no próprio tenant", async () => {
    const { ok, rowCount } = await tryWrite(
      "authenticated",
      USER_A,
      "INSERT INTO public.patients (id, tenant_id, name) VALUES ('rt-self', $1, 'Self')",
      [TENANT_A],
    );
    expect(ok).toBe(true);
    expect(rowCount).toBe(1);
  });

  it("acesso secundário via user_tenants habilita leitura do segundo tenant", async () => {
    const rows = await selectAs("authenticated", USER_D, "SELECT id FROM public.patients ORDER BY id");
    const result = ids(rows);
    expect(result).toContain(PATIENT_A);
    expect(result).toContain(PATIENT_B); // secondary access
    expect(result).not.toContain(PATIENT_C);
  });

  it("super_admin acessa tenant filho, mas não tenant irmão", async () => {
    const rows = await selectAs("authenticated", USER_C, "SELECT id FROM public.patients ORDER BY id");
    const result = ids(rows);
    expect(result).toContain(PATIENT_A);
    expect(result).toContain(PATIENT_C); // child tenant (rt-c has parent rt-a)
    expect(result).not.toContain(PATIENT_B); // sibling (parent null) -> blocked
  });

  it("mega_admin acessa todos os tenants", async () => {
    const rows = await selectAs("authenticated", USER_MEGA, "SELECT id FROM public.patients ORDER BY id");
    const result = ids(rows);
    expect(result).toContain(PATIENT_A);
    expect(result).toContain(PATIENT_B);
    expect(result).toContain(PATIENT_C);
  });

  it("usuário de um tenant não enxerga patient_ids de outro (direto por PK)", async () => {
    const rows = await selectAs(
      "authenticated",
      USER_A,
      "SELECT id FROM public.patients WHERE id = $1",
      [PATIENT_B],
    );
    expect(rows).toHaveLength(0);
  });
});
