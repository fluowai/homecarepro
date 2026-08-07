import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../src/server/app";

// ── Fluent Supabase admin mock ──────────────────────────────────
// Handles the chained query patterns used by the routes:
//   from(t).select(...).eq(...).single() | maybeSingle()
//   from(t).select(...).eq(...)            (awaitable chain)
//   from(t).update(...).eq(...) / delete().eq(...)
//   auth.getUser(token) / auth.admin.deleteUser(id)

type TableResult = (table: string, method: "single" | "maybeSingle" | "select" | "update" | "delete", eqPairs: Array<[string, unknown]>) => { data?: unknown; error?: unknown };

interface MockOptions {
  getUser?: (token: string) => { data: { user?: unknown } | null; error?: unknown };
  tableResult?: TableResult;
  adminDeleteUser?: () => { error?: unknown };
  adminCreateUser?: () => { data?: unknown; error?: unknown };
}

function createMockSupabase(opts: MockOptions) {
  const calls = {
    updates: [] as Array<{ table: string; eq: Array<[string, unknown]> }>,
    deletes: [] as Array<{ table: string; eq: Array<[string, unknown]> }>,
  };

  const auth = {
    getUser: vi.fn(async (token: string) => {
      if (opts.getUser) return opts.getUser(token);
      return token === "valid-token"
        ? { data: { user: { id: "u-1", email: "admin@homecarepro.com" } }, error: null }
        : { data: { user: null }, error: { message: "Invalid login credentials" } };
    }),
    admin: {
      deleteUser: vi.fn(async () => opts.adminDeleteUser?.() ?? { error: null }),
      createUser: vi.fn(async () => opts.adminCreateUser?.() ?? { data: { user: { id: "u-new" } }, error: null }),
    },
  };

  const from = vi.fn((table: string) => {
    let eqPairs: Array<[string, unknown]> = [];
    const resolve = (method: "single" | "maybeSingle" | "select" | "update" | "delete") =>
      opts.tableResult
        ? opts.tableResult(table, method, [...eqPairs])
        : { data: null, error: null };

    const chain: any = {
      select: () => chain,
      update: () => chain,
      delete: () => chain,
      insert: () => chain,
      upsert: () => chain,
      eq: (col: string, val: unknown) => {
        eqPairs.push([col, val]);
        return chain;
      },
      neq: (col: string, val: unknown) => {
        eqPairs.push([col, val]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      single: async () => resolve("single"),
      maybeSingle: async () => resolve("maybeSingle"),
      then: (onFulfilled: (v: unknown) => unknown) => onFulfilled(resolve("select")),
    };

    const updateSpy = (values: Record<string, unknown>) => {
      calls.updates.push({ table, eq: [...eqPairs] });
      return chain;
    };
    chain.update = updateSpy;

    const deleteSpy = () => {
      calls.deletes.push({ table, eq: [...eqPairs] });
      return chain;
    };
    chain.delete = deleteSpy;

    return chain;
  });

  return {
    supabase: { auth, from } as any,
    calls,
  };
}

function makeApp(opts: MockOptions = {}) {
  const { supabase, calls } = createMockSupabase(opts);
  const app: Express = createApp({
    supabaseAdmin: supabase,
    ai: null,
    isProduction: false,
    enableRateLimit: false,
  });
  return { app, calls, supabase };
}

const AUTH = { Authorization: "Bearer valid-token" };

describe("GET /api/health", () => {
  it("retorna ok quando o banco responde", async () => {
    const { app } = makeApp({ tableResult: () => ({ data: [{ id: "t1" }], error: null }) });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.dependencies.database).toBe("up");
  });

  it("retorna degraded quando o banco falha", async () => {
    const { app } = makeApp({ tableResult: () => ({ data: null, error: { message: "down" } }) });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies.database).toBe("down");
  });
});

describe("POST /api/auth/verify", () => {
  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/auth/verify");
    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it("retorna 401 com token inválido", async () => {
    const { app } = makeApp({ getUser: () => ({ data: { user: null }, error: { message: "expired" } }) });
    const res = await request(app).post("/api/auth/verify").set({ Authorization: "Bearer bad-token" });
    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it("retorna 200 com token válido", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/auth/verify").set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ valid: true, userId: "u-1" });
  });
});

describe("GET /api/tenant/resolve", () => {
  const tenantResult = (tenant: unknown) => ({ data: tenant, error: null });

  it("retorna 400 sem domain", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/tenant/resolve");
    expect(res.status).toBe(400);
  });

  it("resolve tenant ativo por domínio custom", async () => {
    const { app } = makeApp({
      tableResult: (table, method) =>
        table === "tenants"
          ? tenantResult({ id: "t1", name: "Clínica X", status: "active" })
          : { data: null, error: null },
    });
    const res = await request(app).get("/api/tenant/resolve").query({ domain: "clinicax.com.br" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "t1", status: "active" });
  });

  it("cai no fallback do tenant system quando não acha o domínio", async () => {
    const { app } = makeApp({
      tableResult: (table, _method, eqPairs) => {
        if (table !== "tenants") return { data: null, error: null };
        const hasCustomDomain = eqPairs.some(([col]) => col === "custom_domain");
        const isSystem = eqPairs.some(([col, val]) => col === "id" && val === "system");
        if (hasCustomDomain) return { data: null, error: null };
        if (isSystem) return { data: { id: "system", name: "System", status: "active" }, error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app).get("/api/tenant/resolve").query({ domain: "naoexiste.com" });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("system");
  });

  it("retorna 403 para tenant inativo", async () => {
    const { app } = makeApp({
      tableResult: (table) =>
        table === "tenants" ? tenantResult({ id: "t1", status: "inactive" }) : { data: null, error: null },
    });
    const res = await request(app).get("/api/tenant/resolve").query({ domain: "bloqueado.com" });
    expect(res.status).toBe(403);
  });

  it("retorna 404 quando nem custom nem system existem", async () => {
    const { app } = makeApp({ tableResult: () => ({ data: null, error: null }) });
    const res = await request(app).get("/api/tenant/resolve").query({ domain: "ghost.com" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/gemini/triage", () => {
  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/gemini/triage").send({ description: "falta de ar" });
    expect(res.status).toBe(401);
  });

  it("retorna 400 sem descrição", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/gemini/triage").set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it("retorna triagem com fallback rule-based em dev", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/gemini/triage")
      .set(AUTH)
      .send({ description: "Paciente com falta de ar e saturacao baixa" });
    expect(res.status).toBe(200);
    expect(res.body.urgency).toBe("Critica");
    expect(res.body.urgencyScore).toBe(9);
    expect(Array.isArray(res.body.recommendedActions)).toBe(true);
  });
});

describe("POST /api/gemini/transcribe", () => {
  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/gemini/transcribe").send({ audioData: "SGVsbG8=" });
    expect(res.status).toBe(401);
  });

  it("retorna 400 sem audioData", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/gemini/transcribe").set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  it("retorna transcrição simulada em dev", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/gemini/transcribe")
      .set(AUTH)
      .send({ audioData: "data:audio/webm;base64,SGVsbG8=", mimeType: "audio/webm" });
    expect(res.status).toBe(200);
    expect(typeof res.body.transcription).toBe("string");
    expect(res.body.transcription.length).toBeGreaterThan(0);
  });
});

describe("AI em produção sem chave retorna 503", () => {
  it("bloqueia fallback simulado em produção", async () => {
    const { supabase } = createMockSupabase({});
    const app: Express = createApp({
      supabaseAdmin: supabase,
      ai: null,
      isProduction: true,
      enableRateLimit: false,
    });
    const res = await request(app)
      .post("/api/gemini/triage")
      .set(AUTH)
      .send({ description: "teste" });
    expect(res.status).toBe(503);
  });
});

describe("GET /api/lgpd/privacy-policy", () => {
  it("retorna a política com campos obrigatórios", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/lgpd/privacy-policy");
    expect(res.status).toBe(200);
    expect(res.body.company).toBe("HomeCare Pro");
    expect(Array.isArray(res.body.rights)).toBe(true);
    expect(res.body.dpoEmail).toBeTruthy();
  });
});

describe("GET /api/lgpd/export", () => {
  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/lgpd/export");
    expect(res.status).toBe(401);
  });

  it("exporta perfil e pacientes do tenant", async () => {
    const { app } = makeApp({
      tableResult: (table) => {
        if (table === "user_profiles") return { data: { id: "u-1", tenant_id: "sp", role: "admin" }, error: null };
        if (table === "patients") return { data: [{ id: "pat-1", tenant_id: "sp" }], error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app).get("/api/lgpd/export").set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.profile.tenant_id).toBe("sp");
    expect(res.body.patients).toHaveLength(1);
  });
});

describe("DELETE /api/lgpd/delete", () => {
  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).delete("/api/lgpd/delete");
    expect(res.status).toBe(401);
  });

  it("retorna 404 quando perfil não existe", async () => {
    const { app } = makeApp({ tableResult: () => ({ data: null, error: null }) });
    const res = await request(app).delete("/api/lgpd/delete").set(AUTH);
    expect(res.status).toBe(404);
  });

  it("remove perfil e usuário quando encontrado", async () => {
    const { supabase } = createMockSupabase({
      tableResult: (table) =>
        table === "user_profiles" ? { data: { id: "u-1", tenant_id: "sp" }, error: null } : { data: null, error: null },
    });
    const app: Express = createApp({
      supabaseAdmin: supabase,
      ai: null,
      isProduction: false,
      enableRateLimit: false,
    });
    const res = await request(app).delete("/api/lgpd/delete").set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith("u-1");
  });
});

describe("POST /api/webhooks/asaas", () => {
  it("retorna 401 com token de webhook incorreto", async () => {
    const { supabase } = createMockSupabase({});
    const app: Express = createApp({
      supabaseAdmin: supabase,
      ai: null,
      isProduction: false,
      asaasWebhookToken: "secret",
      enableRateLimit: false,
    });
    const res = await request(app)
      .post("/api/webhooks/asaas")
      .set({ "asaas-access-token": "wrong" })
      .send({ event: "PAYMENT_RECEIVED", payment: { id: "pay-1" } });
    expect(res.status).toBe(401);
  });

  it("retorna 400 sem payload de payment", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/webhooks/asaas").send({ event: "PAYMENT_RECEIVED" });
    expect(res.status).toBe(400);
  });

  it("marca invoice como RECEIVED", async () => {
    const { app, calls } = makeApp();
    const res = await request(app)
      .post("/api/webhooks/asaas")
      .send({ event: "PAYMENT_RECEIVED", payment: { id: "pay-1" } });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0].table).toBe("invoices");
  });

  it("ignora webhook duplicado (idempotência)", async () => {
    const { app, calls } = makeApp();
    const payload = { event: "PAYMENT_RECEIVED", payment: { id: "pay-dup" } };
    const first = await request(app).post("/api/webhooks/asaas").send(payload);
    const second = await request(app).post("/api/webhooks/asaas").send(payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.received).toBe(true);
    expect(calls.updates).toHaveLength(1);
  });
});

describe("PUT /api/tenant/config", () => {
  const adminProfile = (role: string, tenantId = "sp") => ({
    tableResult: (table: string) =>
      table === "user_profiles" ? { data: { role, tenant_id: tenantId }, error: null } : { data: null, error: null },
  });

  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).put("/api/tenant/config").send({});
    expect(res.status).toBe(401);
  });

  it("retorna 403 para operador", async () => {
    const { app } = makeApp(adminProfile("operator"));
    const res = await request(app).put("/api/tenant/config").set(AUTH).send({ customDomain: "x.com" });
    expect(res.status).toBe(403);
  });

  it("retorna 400 quando o domínio já está em uso", async () => {
    const { app } = makeApp({
      tableResult: (table, method, eqPairs) => {
        if (table === "user_profiles") return { data: { role: "mega_admin", tenant_id: "sp" }, error: null };
        if (table === "tenants" && method === "maybeSingle") return { data: { id: "other" }, error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app)
      .put("/api/tenant/config")
      .set(AUTH)
      .send({ customDomain: "jausado.com", tenantId: "t1" });
    expect(res.status).toBe(400);
  });

  it("super_admin atualiza o próprio tenant", async () => {
    const { app } = makeApp(adminProfile("super_admin", "sp"));
    const res = await request(app)
      .put("/api/tenant/config")
      .set(AUTH)
      .send({ customDomain: "clinica.sp.com" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/internal/caddy-ask", () => {
  it("retorna 400 sem domain", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/internal/caddy-ask");
    expect(res.status).toBe(400);
  });

  it("autoriza localhost e domínios principais", async () => {
    const { app } = makeApp();
    for (const domain of ["localhost", "api.homecarepro.com.br", "homecarepro.com.br"]) {
      const res = await request(app).get("/api/internal/caddy-ask").query({ domain });
      expect(res.status).toBe(200);
    }
  });

  it("autoriza domínio de tenant ativo", async () => {
    const { app } = makeApp({
      tableResult: (table) =>
        table === "tenants" ? { data: { id: "t1", status: "active" }, error: null } : { data: null, error: null },
    });
    const res = await request(app).get("/api/internal/caddy-ask").query({ domain: "clinica.com.br" });
    expect(res.status).toBe(200);
  });

  it("nega domínio desconhecido", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/internal/caddy-ask").query({ domain: "estranho.com.br" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/admin/tenants", () => {
  const profile = (role: string, tenantId = "sp") => ({
    tableResult: (table: string) =>
      table === "user_profiles" ? { data: { role, tenant_id: tenantId }, error: null } : { data: null, error: null },
  });

  it("retorna 401 sem token", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/admin/tenants").send({ name: "X", adminEmail: "a@b.com" });
    expect(res.status).toBe(401);
  });

  it("retorna 403 para operador", async () => {
    const { app } = makeApp(profile("operator"));
    const res = await request(app).post("/api/admin/tenants").set(AUTH).send({ name: "X", adminEmail: "a@b.com" });
    expect(res.status).toBe(403);
  });

  it("retorna 400 sem adminEmail ou email inválido", async () => {
    const { app } = makeApp(profile("mega_admin"));
    const noEmail = await request(app).post("/api/admin/tenants").set(AUTH).send({ name: "X" });
    expect(noEmail.status).toBe(400);
    const badEmail = await request(app).post("/api/admin/tenants").set(AUTH).send({ name: "X", adminEmail: "invalido" });
    expect(badEmail.status).toBe(400);
  });

  it("mega_admin cria revenda (sem parentId) com convite de super_admin", async () => {
    const { app } = makeApp(profile("mega_admin"));
    const res = await request(app).post("/api/admin/tenants").set(AUTH).send({ name: "Revenda SP", adminEmail: "revenda@sp.com" });
    expect(res.status).toBe(201);
    expect(res.body.tenant.parentId).toBeNull();
    expect(res.body.inviteLink).toContain("/?invite=");
  });

  it("super_admin cria clínica filha com parentId próprio", async () => {
    const { app } = makeApp(profile("super_admin", "rev-1"));
    const res = await request(app).post("/api/admin/tenants").set(AUTH).send({ name: "Clínica Filha", adminEmail: "cli@filha.com" });
    expect(res.status).toBe(201);
    expect(res.body.tenant.parentId).toBe("rev-1");
    expect(res.body.inviteLink).toContain("/?invite=");
  });
});

describe("POST /api/admin/tenants/:id/invite", () => {
  const profile = (role: string, tenantId = "sp") => ({
    tableResult: (table: string, method: string) => {
      if (table === "user_profiles") return { data: { role, tenant_id: tenantId }, error: null };
      if (table === "tenants" && method === "single") return { data: { id: "t-1", parent_id: null }, error: null };
      return { data: null, error: null };
    },
  });

  it("retorna 403 para super_admin que não é dono da clínica", async () => {
    const { app } = makeApp({
      tableResult: (table, method) => {
        if (table === "user_profiles") return { data: { role: "super_admin", tenant_id: "rev-1" }, error: null };
        if (table === "tenants" && method === "single") return { data: { id: "t-1", parent_id: "rev-2" }, error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app).post("/api/admin/tenants/t-1/invite").set(AUTH).send({ adminEmail: "a@b.com" });
    expect(res.status).toBe(403);
  });

  it("gera novo convite para tenant existente", async () => {
    const { app } = makeApp(profile("mega_admin"));
    const res = await request(app).post("/api/admin/tenants/t-1/invite").set(AUTH).send({ adminEmail: "a@b.com" });
    expect(res.status).toBe(201);
    expect(res.body.inviteLink).toContain("/?invite=");
  });

  it("retorna 400 sem adminEmail", async () => {
    const { app } = makeApp(profile("mega_admin"));
    const res = await request(app).post("/api/admin/tenants/t-1/invite").set(AUTH).send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/invites/:token", () => {
  it("retorna 404 para token inexistente", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/invites/unknown-token");
    expect(res.status).toBe(404);
  });

  it("retorna dados do convite pendente com tenant", async () => {
    const { app } = makeApp({
      tableResult: (table, method) => {
        if (table === "tenant_invitations") return { data: { id: "inv-1", tenant_id: "t-1", email: "a@b.com", role: "admin", status: "pending", expires_at: new Date(Date.now() + 60000).toISOString() }, error: null };
        if (table === "tenants" && method === "single") return { data: { id: "t-1", name: "Clínica X", logo: "", primary_color: null, secondary_color: null }, error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app).get("/api/invites/valid-token");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("a@b.com");
    expect(res.body.role).toBe("admin");
    expect(res.body.tenant.name).toBe("Clínica X");
  });

  it("retorna 410 para convite expirado", async () => {
    const { app } = makeApp({
      tableResult: (table) =>
        table === "tenant_invitations"
          ? { data: { id: "inv-1", tenant_id: "t-1", email: "a@b.com", role: "admin", status: "pending", expires_at: new Date(Date.now() - 60000).toISOString() }, error: null }
          : { data: null, error: null },
    });
    const res = await request(app).get("/api/invites/expired-token");
    expect(res.status).toBe(410);
  });
});

describe("POST /api/invites/accept", () => {
  const pendingInvite = {
    id: "inv-1",
    tenant_id: "t-1",
    email: "a@b.com",
    role: "admin",
    status: "pending",
    expires_at: new Date(Date.now() + 60000).toISOString(),
  };

  it("retorna 400 sem campos obrigatórios", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/invites/accept").send({});
    expect(res.status).toBe(400);
  });

  it("retorna 400 com senha curta", async () => {
    const { app } = makeApp();
    const res = await request(app).post("/api/invites/accept").send({ token: "x", fullName: "Ana", password: "123" });
    expect(res.status).toBe(400);
  });

  it("cria conta e marca convite como aceito", async () => {
    const { app, calls } = makeApp({
      tableResult: (table, method) => {
        if (table === "tenant_invitations" && method === "maybeSingle") return { data: pendingInvite, error: null };
        if (table === "tenant_invitations" && method === "update") return { data: null, error: null };
        return { data: null, error: null };
      },
    });
    const res = await request(app).post("/api/invites/accept").send({ token: "t", fullName: "Ana", password: "123456" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const accepted = calls.updates.find((c) => c.table === "tenant_invitations");
    expect(accepted).toBeTruthy();
  });

  it("retorna 409 se e-mail já cadastrado", async () => {
    const { app } = makeApp({
      tableResult: (table, method) =>
        table === "tenant_invitations" && method === "maybeSingle" ? { data: pendingInvite, error: null } : { data: null, error: null },
      adminCreateUser: () => ({ data: null, error: { message: "A user with this email address already exists" } }),
    });
    const res = await request(app).post("/api/invites/accept").send({ token: "t", fullName: "Ana", password: "123456" });
    expect(res.status).toBe(409);
  });
});

beforeEach(() => {
  vi.restoreAllMocks();
});
