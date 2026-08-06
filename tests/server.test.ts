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

beforeEach(() => {
  vi.restoreAllMocks();
});
