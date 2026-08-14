import express from "express";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import { promises as dnsImpl } from "node:dns";
import { z } from "zod";

// ── Zod validation schemas for AI endpoints ────────────────────────

const transcribeSchema = z.object({
  audioData: z.string().min(1),
  mimeType: z.string().optional(),
});

const summarizePatientSchema = z.object({
  patient: z.object({
    name: z.string().min(1),
    birthDate: z.string().optional(),
    diagnostic: z.string().optional(),
    allergies: z.array(z.string()).optional().default([]),
    medications: z.array(z.string()).optional().default([]),
    timeline: z.array(z.any()).optional().default([]),
  }),
});

const visitReportSchema = z.object({
  patientName: z.string().min(1).optional(),
  professionalName: z.string().min(1).optional(),
  rawNotes: z.string().min(1),
  vitals: z.object({
    pa: z.string().optional(),
    fc: z.string().optional(),
    temp: z.string().optional(),
    sat: z.string().optional(),
  }).optional(),
});

const suggestScheduleSchema = z.object({
  visits: z.array(z.any()).min(1),
  professionals: z.array(z.any()).min(1),
  patients: z.array(z.any()).optional().default([]),
});

const triageSchema = z.object({
  description: z.string().min(1),
  patientAge: z.number().int().positive().optional(),
  mainCondition: z.string().min(1).optional(),
});

// ── App Factory (testable) ───────────────────────────────────────
// server.ts bootstraps the real environment and calls createApp().
// Tests call createApp() with a mocked/injected Supabase client.

export interface DnsClient {
  resolveCname: (hostname: string) => Promise<string[]>;
  resolve4: (hostname: string) => Promise<string[]>;
}

export interface CreateAppOptions {
  supabaseAdmin: SupabaseClient;
  ai?: GoogleGenAI | null;
  isProduction?: boolean;
  asaasWebhookToken?: string;
  appUrl?: string;
  enableRateLimit?: boolean;
  dns?: DnsClient;
}

export function createApp(options: CreateAppOptions) {
  const {
    supabaseAdmin,
    ai = null,
    isProduction = false,
    asaasWebhookToken,
    appUrl = "http://localhost:3000",
    enableRateLimit = true,
    dns: dnsClient,
  } = options;

  const dns = dnsClient ?? dnsImpl;

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";

  // ── Express App ─────────────────────────────────────────────────
  const app = express();

  // CSP nonce middleware — generates a per-request nonce for inline scripts
  app.use((req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString("base64");
    next();
  });

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? ["'self'", (req: express.Request, res: express.Response) => `'nonce-${res.locals.cspNonce}'`]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", SUPABASE_URL, "ws://localhost:*", "http://localhost:*"].filter(Boolean),
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: appUrl,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }));

  app.use(express.json({ limit: "10mb" }));

  // ── Rate Limiters ───────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Aguarde 15 minutos." },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições de IA. Aguarde 1 minuto." },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de autenticação. Aguarde 15 minutos." },
  });

  if (enableRateLimit) {
    app.use("/api/", globalLimiter);
  }

  // ── Auth Middleware ──────────────────────────────────────────────
  async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticação necessário." });
    }

    const token = authHeader.slice(7);
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Sessão inválida ou expirada." });
      }
      (req as any).userId = user.id;
      (req as any).userEmail = user.email;
      next();
    } catch {
      return res.status(401).json({ error: "Falha na verificação de autenticação." });
    }
  }

  // ── Structured Logger ───────────────────────────────────────────
  function aiUnavailable(res: express.Response) {
    if (isProduction) {
      return res.status(503).json({ error: "Serviço de IA não configurado no servidor." });
    }
    return null;
  }

  // ── Health Check (public) ──────────────────────────────────────
  app.get("/api/health", async (_req, res) => {
    try {
      const { error } = await supabaseAdmin
        .from("tenants")
        .select("id", { count: "exact", head: true });

      const dbOk = !error;

      res.json({
        status: dbOk ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        dependencies: {
          database: dbOk ? "up" : "down",
        },
      });
    } catch {
      res.json({
        status: "degraded",
        timestamp: new Date().toISOString(),
        dependencies: {
          database: "down",
        },
      });
    }
  });

  // ── Auth endpoints ──────────────────────────────────────────────
  app.post("/api/auth/verify", authLimiter, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ valid: false });
    }
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
      if (error || !user) {
        return res.status(401).json({ valid: false });
      }
      res.json({ valid: true, userId: user.id, email: user.email });
    } catch {
      res.status(401).json({ valid: false });
    }
  });

  // ── AI Endpoints (authenticated) ────────────────────────────────

  // 1. Transcrição de Áudio
  app.post("/api/gemini/transcribe", requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = transcribeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }
      const { audioData, mimeType } = result.data;

      if (!ai) {
        const blocked = aiUnavailable(res);
        if (blocked) return blocked;

        return res.status(503).json({ error: "Servidor de IA não configurado. Defina GEMINI_API_KEY para habilitar a transcrição." });
      }

      const cleanBase64 = audioData.includes(",") ? audioData.split(",")[1] : audioData;
      const cleanMimeType = mimeType || "audio/webm";

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: cleanMimeType,
              data: cleanBase64,
            },
          },
          {
            text: "Transcreva com máxima precisão em português do Brasil o conteúdo falado neste áudio de ditado de enfermagem/home care. Corrija a pontuação e gramática de forma profissional, mantendo os dados relatados. Retorne APENAS o texto transcrito, sem introduções ou observações adicionais.",
          },
        ],
      });

      const transcription = response.text ? response.text.trim() : "";
      logEvent("INFO", "Audio transcription completed", { userId: (req as any).userId });
      return res.json({ transcription });
    } catch (error: any) {
      logEvent("ERROR", "Audio transcription failed", { error: error.message });
      res.status(500).json({ error: "Falha ao transcrever áudio." });
    }
  });

  // 2. Resumo do Paciente com IA
  app.post("/api/gemini/summarize-patient", requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = summarizePatientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }
      const { patient } = result.data;

      if (!ai) {
        const blocked = aiUnavailable(res);
        if (blocked) return blocked;

        return res.status(503).json({ error: "Servidor de IA não configurado. Defina GEMINI_API_KEY para gerar o resumo." });
      }

      const prompt = `Você é um médico especialista em auditoria e coordenação de Home Care (atendimento domiciliar).
Analise os dados estruturados do paciente abaixo e crie um Resumo Clínico Executivo rico, humanizado e extremamente profissional para a equipe de enfermagem e cuidadores.

DADOS DO PACIENTE:
- Nome: ${patient.name}
- Idade: ${getAge(patient.birthDate)} anos (${patient.birthDate})
- Diagnóstico Principal: ${patient.diagnostic}
- Alergias: ${patient.allergies.join(", ") || "Nenhuma relatada"}
- Medicamentos em Uso: ${patient.medications.join(", ") || "Nenhum informado"}
- Eventos Recentes na Linha do Tempo:
${patient.timeline?.map((t: any) => `- [${t.date}] ${t.title}: ${t.description}`).join("\n") || "Sem histórico recente"}

INSTRUÇÕES DO RESUMO:
- Use tópicos claros e objetivos.
- Destaque ALERTA DE SEGURANÇA ou RISCOS de forma proeminente (ex: alergias, risco de queda ou broncoaspiração).
- Apresente Recomendações de Cuidados Operacionais Práticos.
- Mantenha o texto em português brasileiro profissional e acolhedor.
- Não use Markdown muito pesado, use quebras de linha e negrito simples.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      logEvent("INFO", "Patient summary generated", { userId: (req as any).userId, patientName: patient.name });
      res.json({ summary: response.text });
    } catch (error: any) {
      logEvent("ERROR", "Patient summary failed", { error: error.message });
      res.status(500).json({ error: "Falha ao gerar resumo do paciente." });
    }
  });

  // 3. Geração de Relatório de Visita
  app.post("/api/gemini/generate-visit-report", requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = visitReportSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }
      const { patientName, professionalName, rawNotes, vitals } = result.data;

      if (!ai) {
        const blocked = aiUnavailable(res);
        if (blocked) return blocked;

        return res.status(503).json({ error: "Servidor de IA não configurado. Defina GEMINI_API_KEY para gerar o relatório." });
      }

      const prompt = `Você é um enfermeiro supervisor de Home Care. Traduza as anotações brutas e rápidas do profissional de campo em uma Evolução de Enfermagem Técnica e extremamente profissional (Relatório de Visita), adequada para prontuário e apresentação para a família/plano de saúde.

DADOS DA VISITA:
- Paciente: ${patientName || "Não informado"}
- Profissional: ${professionalName || "Não informado"}
- Sinais Vitais anotados:
  * Pressão Arterial (PA): ${vitals?.pa || "Não medido"}
  * Frequência Cardíaca (FC): ${vitals?.fc || "Não medido"} bpm
  * Temperatura: ${vitals?.temp || "Não medido"} °C
  * Saturação O2: ${vitals?.sat || "Não medido"} %
- Anotações brutas do profissional: "${rawNotes}"

INSTRUÇÕES DO RELATÓRIO:
1. Reorganize em formato profissional de prontuário com seções claras: (I) Avaliação Geral, (II) Parâmetros Vitais e Quadro Clínico, (III) Procedimentos e Condutas Realizadas, (IV) Parecer de Supervisão.
2. Enriqueça os termos técnicos (ex: em vez de "paciente tá com preguiça", use "paciente apresenta quadro de letargia ou hipoatividade").
3. Escreva em português de forma formal, clara, ética e precisa.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      logEvent("INFO", "Visit report generated", { userId: (req as any).userId, patientName });
      res.json({ report: response.text });
    } catch (error: any) {
      logEvent("ERROR", "Visit report generation failed", { error: error.message });
      res.status(500).json({ error: "Falha ao gerar relatório de visita." });
    }
  });

  // 4. Sugestão de Agenda Otimizada
  app.post("/api/gemini/suggest-schedule", requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = suggestScheduleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }
      const { visits, professionals, patients } = result.data;

      if (!ai) {
        const blocked = aiUnavailable(res);
        if (blocked) return blocked;

        return res.status(503).json({ error: "Servidor de IA não configurado. Defina GEMINI_API_KEY para gerar a sugestão." });
      }

      const prompt = `Você é um coordenador de logística e operações médicas de uma empresa de Home Care.
Analise a listagem de visitas, profissionais e pacientes pendentes para otimizar a escala e reduzir deslocamento e fadiga dos profissionais.

LISTA DE PROFISSIONAIS DISPONÍVEIS:
${JSON.stringify(professionals.map((p: any) => ({ name: p.name, specialty: p.specialty, status: p.status })))}

LISTA DE PACIENTES PARA ATENDIMENTO:
${JSON.stringify(patients.map((pat: any) => ({ name: pat.name, diagnostic: pat.diagnostic, address: pat.address })))}

VISITAS PREVISTAS:
${JSON.stringify(visits.map((v: any) => ({ visitId: v.visitId, professionalId: v.professionalId, date: v.date, time: `${v.timeStart}-${v.timeEnd}` })))}

Crie um plano estratégico de escala otimizada com:
- Análise de compatibilidade (se os profissionais estão na especialidade correta para os diagnósticos).
- Sugestão de reagrupamento geográfico de visitas para economizar tempo de viagem.
- Recomendações de horários mais adequados de acordo com a patologia do paciente (ex: fisioterapia após medicação, etc.).
- Liste recomendações em tópicos curtos e objetivos em português.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      logEvent("INFO", "Schedule suggestion generated", { userId: (req as any).userId });
      res.json({ suggestion: response.text });
    } catch (error: any) {
      logEvent("ERROR", "Schedule suggestion failed", { error: error.message });
      res.status(500).json({ error: "Falha ao sugerir otimização de escalas." });
    }
  });

  // 5. Triagem Inteligente
  app.post("/api/gemini/triage", requireAuth, aiLimiter, async (req, res) => {
    try {
      const result = triageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }
      const { description, patientAge, mainCondition } = result.data;

      if (!ai) {
        const blocked = aiUnavailable(res);
        if (blocked) return blocked;

        const text = description.toLowerCase();
        let urgency: "Critica" | "Alta" | "Media" | "Baixa" = "Media";
        let urgencyScore = 5;
        let specialty: "Enfermeiro" | "Tecnico de Enfermagem" | "Fisioterapeuta" | "Fonoaudiologo" | "Medico" | "Nutricionista" = "Enfermeiro";
        let responseTime = "Atendimento em ate 6 horas";
        let clinicalRationale = "Triagem baseada em algoritmo de urgencia por palavras-chave clinicas.";
        let recommendedActions: string[] = [
          "Realizar contato telefonico previo com o responsavel",
          "Verificar historico de alergias e comorbidades antes da partida",
          "Aferir sinais vitais completos no primeiro contato"
        ];

        if (text.includes("falta de ar") || text.includes("dispneia") || text.includes("saturacao") || text.includes("parada") || text.includes("dor no peito") || text.includes("inconsciente") || text.includes("critica") || text.includes("convulsao")) {
          urgency = "Critica";
          urgencyScore = 9;
          specialty = text.includes("respira") || text.includes("saturacao") ? "Fisioterapeuta" : "Medico";
          responseTime = "Atendimento Imediato (Ate 2 horas)";
          clinicalRationale = "Sinais evidentes de desconforto respiratorio ou instabilidade hemodinamica critica requerem intervencao medica/fisioterapeutica urgente em domicilio.";
          recommendedActions = [
            "Disponibilizar oxigenoterapia de emergencia se necessario",
            "Acionar medico plantonista de sobreaviso",
            "Instruir familiar sobre posicionamento e manter vias aereas pervias"
          ];
        } else if (text.includes("sonda") || text.includes("curativo") || text.includes("lesao") || text.includes("traqueo") || text.includes("refluxo") || text.includes("febre")) {
          urgency = "Alta";
          urgencyScore = 7;
          specialty = "Enfermeiro";
          responseTime = "Atendimento Prioritario (Ate 4 horas)";
          clinicalRationale = "Procedimento invasivo (sonda/curativo) ou manejo de estomas requer habilidade tecnica do Enfermeiro para prevencao de infeccoes e complicacoes.";
          recommendedActions = [
            "Separar kit de curativo esteril ou sonda de substituicao",
            "Avaliar presenca de hiperemia ou secrecao purulenta",
            "Orientar a equipe de enfermagem sobre tecnica asseptica"
          ];
        } else if (text.includes("engasgo") || text.includes("engolir") || text.includes("disfagia") || text.includes("voz")) {
          urgency = "Media";
          urgencyScore = 6;
          specialty = "Fonoaudiologo";
          responseTime = "Programado para ate 12 horas";
          clinicalRationale = "Alteracoes de degluticao requerem avaliacao fonoaudiologica especializada para evitar risco de broncoaspiracao de dieta e secrecoes.";
          recommendedActions = [
            "Avaliar consistencia atual da dieta (pastosa/liquida)",
            "Manter paciente elevado a 45-90 durante alimentacao",
            "Agendar teste de degluticao com fonoaudiologo"
          ];
        } else if (text.includes("movimento") || text.includes("avc") || text.includes("fraqueza") || text.includes("marcha") || text.includes("fisioterapia")) {
          urgency = "Media";
          urgencyScore = 5;
          specialty = "Fisioterapeuta";
          responseTime = "Atendimento Programado (Ate 24 horas)";
          clinicalRationale = "Reabilitacao motora e fortalecimento para prevenir contraturas e contratempos de imobilismo leito-cadeira.";
          recommendedActions = [
            "Avaliar amplitude de movimento e forca muscular",
            "Instruir plano de exercicios para cuidador familiar"
          ];
        } else {
          urgency = "Baixa";
          urgencyScore = 3;
          specialty = "Tecnico de Enfermagem";
          responseTime = "Visita de Rotina (Ate 48 horas)";
          clinicalRationale = "Procedimentos de rotina e acompanhamento do plano de cuidados diarios sem sinais imediatos de gravidade.";
        }

        return res.json({
          urgency,
          urgencyScore,
          specialty,
          responseTime,
          clinicalRationale,
          recommendedActions
        });
      }

      const prompt = `Voce e um medico auditor especialista em triagem e acolhimento em Home Care (Manchester / Protocolo Canadense de Triagem Domiciliar).
Analise a solicitacao de atendimento abaixo e determine o nivel de urgencia, a especialidade profissional ideal e as condutas imediatas recomendadas.

DESCRICAO DA SOLICITACAO:
"${description}"
${patientAge ? `- Idade do paciente: ${patientAge} anos` : ""}
${mainCondition ? `- Condicao de base: ${mainCondition}` : ""}

Responda ESTRITAMENTE em formato JSON com os seguintes campos:
{
  "urgency": "Critica" | "Alta" | "Media" | "Baixa",
  "urgencyScore": numero de 1 a 10,
  "specialty": "Enfermeiro" | "Tecnico de Enfermagem" | "Fisioterapeuta" | "Fonoaudiologo" | "Medico" | "Nutricionista",
  "responseTime": "Tempo estimado para resposta em texto claro (ex: Atendimento Imediato ate 2h)",
  "clinicalRationale": "Justificativa medica concisa e direta (2 a 3 frases) do porquue dessa classificacao",
  "recommendedActions": ["Acao 1", "Acao 2", "Acao 3"]
}

Apenas o objeto JSON valido, sem formatacao Markdown adicional nem blocos de codigo se possivel.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let resultText = response.text || "";
      resultText = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(resultText);
        logEvent("INFO", "Triage analyzed", { userId: (req as any).userId, urgency: parsed.urgency });
        return res.json(parsed);
      } catch (_e) {
        return res.json({
          urgency: "Media",
          urgencyScore: 5,
          specialty: "Enfermeiro",
          responseTime: "Atendimento em ate 12 horas",
          clinicalRationale: resultText.slice(0, 300) || "Analise concluida com sucesso.",
          recommendedActions: [
            "Verificar sinais vitais do paciente",
            "Contactar o familiar responsavel",
            "Encaminhar solicitacao a equipe de enfermagem"
          ]
        });
      }
    } catch (error: any) {
      logEvent("ERROR", "Triage analysis failed", { error: error.message });
      res.status(500).json({ error: "Falha ao analisar a triagem." });
    }
  });

  // ── Tenant Resolution & Config (Whitelabel) ──────────────────────────────
  app.put("/api/tenant/config", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { customDomain, primaryColor, secondaryColor, logo, tenantId } = req.body;

      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("role, tenant_id")
        .eq("id", userId)
        .single();

      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const targetTenantId = profile.role === "mega_admin" && tenantId ? tenantId : profile.tenant_id;

      if (customDomain) {
        // Check if domain is already used by another tenant
        const { data: existing } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .eq("custom_domain", customDomain)
          .neq("id", targetTenantId)
          .maybeSingle();
        if (existing) {
          return res.status(400).json({ error: "Domínio já está em uso por outra conta." });
        }
      }

      const { error } = await supabaseAdmin
        .from("tenants")
        .update({
          custom_domain: customDomain || null,
          primary_color: primaryColor || null,
          secondary_color: secondaryColor || null,
          logo: logo || null
        })
        .eq("id", targetTenantId);

      if (error) throw error;

      logEvent("INFO", "Tenant config updated", { targetTenantId, customDomain });
      res.json({ success: true });
    } catch (error: any) {
      logEvent("ERROR", "Tenant config update failed", { error: error.message });
      res.status(500).json({ error: "Falha ao atualizar configuração." });
    }
  });

  app.get("/api/tenant/resolve", globalLimiter, async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
      }

      // Try to find tenant by custom_domain first
      let { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, name, logo, primary_color, secondary_color, status")
        .eq("custom_domain", domain)
        .single();

      // If no custom domain, assume we are on the main domain or a generic one,
      // we could also look up by a subdomain slug if we added a `slug` field.
      // For now, if no match is found, we can return the system tenant or null.
      if (!tenant) {
        // As fallback for testing, let's return a default tenant or null
        const { data: defaultTenant } = await supabaseAdmin
          .from("tenants")
          .select("id, name, logo, primary_color, secondary_color, status")
          .eq("id", "system")
          .single();
        tenant = defaultTenant;
      }

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      if (tenant.status !== "active") {
        return res.status(403).json({ error: "Tenant is not active" });
      }

      res.json(tenant);
    } catch (error: any) {
      logEvent("ERROR", "Tenant resolution failed", { error: error.message });
      res.status(500).json({ error: "Failed to resolve tenant" });
    }
  });

  // ── Tenant Invitations (Reseller & Clinic onboarding) ─────────────
  const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function newInviteToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async function getProfile(userId: string) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("role, tenant_id")
      .eq("id", userId)
      .single();
    return data as { role: string; tenant_id: string } | null;
  }

  // Create a tenant (reseller for mega_admin, clinic for super_admin) and emit an invite link
  app.post("/api/admin/tenants", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { name, cnpj, plan, logo, customDomain, primaryColor, secondaryColor, adminEmail, adminName, parentId } = req.body;
      if (!name || !adminEmail) {
        return res.status(400).json({ error: "Nome da instância e e-mail do administrador são obrigatórios." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        return res.status(400).json({ error: "E-mail do administrador inválido." });
      }

      let targetParent: string | null = null;
      if (profile.role === "super_admin") {
        // Super admin can only create clinics under its own reseller tenant
        targetParent = profile.tenant_id;
      } else if (parentId) {
        targetParent = parentId;
      }
      const inviteRole = targetParent ? "admin" : "super_admin";

      const tenantId = `tenant-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
      const { error: insertError } = await supabaseAdmin.from("tenants").insert({
        id: tenantId,
        name,
        cnpj: cnpj || "",
        plan: plan || "Free",
        logo: logo || "",
        status: "active",
        parent_id: targetParent,
        custom_domain: customDomain || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
      });
      if (insertError) throw insertError;

      const token = newInviteToken();
      const { error: inviteError } = await supabaseAdmin.from("tenant_invitations").insert({
        tenant_id: tenantId,
        email: adminEmail,
        role: inviteRole,
        token,
        status: "pending",
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        created_by: userId,
      });
      if (inviteError) throw inviteError;

      logEvent("INFO", "Tenant created with invitation", { tenantId, role: inviteRole, createdBy: userId, adminName: adminName || "" });
      res.status(201).json({
        tenant: {
          id: tenantId,
          name,
          cnpj: cnpj || "",
          plan: plan || "Free",
          logo: logo || "",
          parentId: targetParent,
          status: "active",
          customDomain: customDomain || undefined,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        inviteLink: `${appUrl}/?invite=${token}`,
      });
    } catch (error: any) {
      logEvent("ERROR", "Tenant creation failed", { error: error.message });
      res.status(500).json({ error: "Falha ao criar instância." });
    }
  });

  // Regenerate an invite link for an existing tenant
  app.post("/api/admin/tenants/:id/invite", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const tenantId = (req.params as any).id;
      const { adminEmail, adminName } = req.body;
      if (!adminEmail) {
        return res.status(400).json({ error: "E-mail do administrador é obrigatório." });
      }

      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("id, parent_id")
        .eq("id", tenantId)
        .single();
      if (tenantError || !tenant) {
        return res.status(404).json({ error: "Instância não encontrada." });
      }

      // Super admin can only invite admins for its own child clinics
      if (profile.role === "super_admin" && tenant.parent_id !== profile.tenant_id) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const inviteRole = tenant.parent_id ? "admin" : "super_admin";
      const token = newInviteToken();
      const { error: inviteError } = await supabaseAdmin.from("tenant_invitations").insert({
        tenant_id: tenantId,
        email: adminEmail,
        role: inviteRole,
        token,
        status: "pending",
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        created_by: userId,
      });
      if (inviteError) throw inviteError;

      logEvent("INFO", "Invite regenerated", { tenantId, role: inviteRole, adminName: adminName || "" });
      res.status(201).json({ inviteLink: `${appUrl}/?invite=${token}` });
    } catch (error: any) {
      logEvent("ERROR", "Invite regeneration failed", { error: error.message });
      res.status(500).json({ error: "Falha ao gerar novo convite." });
    }
  });

  // ── Internal Team (Mega Admin) ──────────────────────────────────

  // Create an internal team member (system tenant) via invite link
  app.post("/api/admin/users", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || profile.role !== "mega_admin") {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { fullName, email, role } = req.body;
      if (!fullName || !email) {
        return res.status(400).json({ error: "Nome completo e e-mail são obrigatórios." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "E-mail inválido." });
      }

      const targetRole = role === "mega_admin" ? "mega_admin" : "system_support";
      const token = newInviteToken();
      const { error } = await supabaseAdmin.from("tenant_invitations").insert({
        tenant_id: "system",
        email: String(email).toLowerCase(),
        role: targetRole,
        token,
        status: "pending",
        expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        created_by: userId,
      });
      if (error) throw error;

      logEvent("INFO", "System team invite created", { email, role: targetRole, createdBy: userId });
      res.status(201).json({ inviteLink: `${appUrl}/?invite=${token}`, email, role: targetRole });
    } catch (error: any) {
      logEvent("ERROR", "System user invite failed", { error: error.message });
      res.status(500).json({ error: "Falha ao criar convite." });
    }
  });

  // Remove an internal team member (Mega Admin only)
  app.delete("/api/admin/users/:id", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || profile.role !== "mega_admin") {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const targetId = (req.params as any).id;
      if (targetId === userId) {
        return res.status(400).json({ error: "Você não pode remover a si mesmo." });
      }

      const { data: target } = await supabaseAdmin
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", targetId)
        .single();
      if (!target || target.tenant_id !== "system") {
        return res.status(404).json({ error: "Membro do time interno não encontrado." });
      }

      await supabaseAdmin.from("user_profiles").delete().eq("id", targetId);
      await supabaseAdmin.auth.admin.deleteUser(targetId);

      logEvent("INFO", "System team member removed", { targetId, byUserId: userId });
      res.json({ success: true });
    } catch (error: any) {
      logEvent("ERROR", "System user removal failed", { error: error.message });
      res.status(500).json({ error: "Falha ao remover o membro." });
    }
  });

  // ── Domain Validation (Mega Admin & Super Admin) ────────────────
  async function checkDomain(domain: string, expectedTarget: string) {
    const host = String(domain || "").toLowerCase().trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const result: { domain: string; cname: string | null; a: string | null; status: "valid" | "warning" | "invalid"; message: string } = {
      domain: host,
      cname: null,
      a: null,
      status: "invalid",
      message: "",
    };

    if (!host) {
      result.message = "Domínio vazio.";
      return result;
    }

    try {
      const cname = await dns.resolveCname(host);
      result.cname = cname[0] || null;
    } catch {
      // no CNAME record
    }

    try {
      const a = await dns.resolve4(host);
      result.a = a[0] || null;
    } catch {
      // no A record
    }

    if (result.cname && expectedTarget && result.cname.toLowerCase() === expectedTarget.toLowerCase()) {
      result.status = "valid";
      result.message = "CNAME apontando corretamente para o sistema.";
    } else if (result.a) {
      result.status = "valid";
      result.message = "Registro A presente — DNS resolvendo para o IP.";
    } else if (result.cname) {
      result.status = "warning";
      result.message = `CNAME encontrado${expectedTarget ? ` (esperado: ${expectedTarget})` : ""}.`;
    } else {
      result.status = "invalid";
      result.message = "Nenhum registro DNS encontrado. Configure um apontamento CNAME/A.";
    }

    return result;
  }

  app.post("/api/admin/domains/check", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { domains, expectedTarget } = req.body;
      if (!Array.isArray(domains) || domains.length === 0 || domains.length > 50) {
        return res.status(400).json({ error: "Informe uma lista de domínios (máx. 50)." });
      }
      if (domains.some((d: unknown) => typeof d !== "string")) {
        return res.status(400).json({ error: "Domínios inválidos." });
      }

      const target = typeof expectedTarget === "string" && expectedTarget.trim()
        ? expectedTarget.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
        : "";

      const results = await Promise.all(
        domains.map((d: string) => checkDomain(d, target))
      );

      logEvent("INFO", "Domain check completed", { userId, count: results.length });
      res.json({ results, expectedTarget: target });
    } catch (error: any) {
      logEvent("ERROR", "Domain check failed", { error: error.message });
      res.status(500).json({ error: "Falha ao validar domínios." });
    }
  });

  // Public: validate an invite token (used by the accept page)
  app.get("/api/invites/:token", globalLimiter, async (req, res) => {
    try {
      const token = (req.params as any).token;
      const { data: invite, error } = await supabaseAdmin
        .from("tenant_invitations")
        .select("id, tenant_id, email, role, status, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ error: "Convite inválido ou já utilizado." });
      }
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: "Convite expirado. Solicite um novo." });
      }

      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, name, logo, primary_color, secondary_color")
        .eq("id", invite.tenant_id)
        .single();

      res.json({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        tenant: tenant
          ? { id: tenant.id, name: tenant.name, logo: tenant.logo, primaryColor: tenant.primary_color, secondaryColor: tenant.secondary_color }
          : { id: invite.tenant_id, name: "Instância", logo: "" },
      });
    } catch (error: any) {
      logEvent("ERROR", "Invite validation failed", { error: error.message });
      res.status(500).json({ error: "Falha ao validar convite." });
    }
  });

  // Public: accept an invite by creating the account (email + password)
  app.post("/api/invites/accept", authLimiter, async (req, res) => {
    try {
      const { token, fullName, password } = req.body;
      if (!token || !fullName || !password) {
        return res.status(400).json({ error: "Preencha nome completo e senha." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }

      const { data: invite, error } = await supabaseAdmin
        .from("tenant_invitations")
        .select("id, tenant_id, email, role, status, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) throw error;
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ error: "Convite inválido ou já utilizado." });
      }
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: "Convite expirado. Solicite um novo." });
      }

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          tenant_id: invite.tenant_id,
          role: invite.role,
        },
      });
      if (createError) {
        if (String(createError.message || "").toLowerCase().includes("already")) {
          return res.status(409).json({ error: "Já existe uma conta com este e-mail. Entre em contato com o suporte." });
        }
        throw createError;
      }

      await supabaseAdmin.from("tenant_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);

      logEvent("INFO", "Invite accepted, account created", { userId: created?.user?.id, tenantId: invite.tenant_id, role: invite.role });
      res.status(201).json({ success: true, email: invite.email, role: invite.role });
    } catch (error: any) {
      logEvent("ERROR", "Invite accept failed", { error: error.message });
      res.status(500).json({ error: "Falha ao criar a conta." });
    }
  });

  // ── Caddy On-Demand TLS Check ────────────────────────────────────
  app.get("/api/internal/caddy-ask", async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain) {
        return res.status(400).send("Missing domain");
      }

      // Always allow the main domain and api subdomain
      if (domain === "homecarepro.com.br" || domain === "api.homecarepro.com.br" || domain.includes("localhost")) {
        return res.status(200).send("OK");
      }

      // Check if any active tenant has this custom domain
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, status")
        .eq("custom_domain", domain)
        .single();

      if (tenant && tenant.status === "active") {
        return res.status(200).send("OK");
      }

      return res.status(404).send("Not Found");
    } catch (error: any) {
      logEvent("ERROR", "Caddy ask failed", { error: error.message });
      return res.status(500).send("Internal Server Error");
    }
  });

  // ── Asaas Webhooks ──────────────────────────────────────────────
  const processedWebhookIds = new Set<string>();

  app.post("/api/webhooks/asaas", express.json({ type: 'application/json' }), async (req, res) => {
    try {
      const token = req.headers["asaas-access-token"];
      if (asaasWebhookToken && token !== asaasWebhookToken) {
        logEvent("WARN", "Invalid Asaas Webhook Token");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { event, payment } = req.body;
      logEvent("INFO", `Asaas Webhook received: ${event}`, { paymentId: payment?.id });

      if (!payment || !payment.id) {
        return res.status(400).json({ error: "Invalid payload" });
      }

      const dedupKey = `${event}:${payment.id}`;
      if (processedWebhookIds.has(dedupKey)) {
        logEvent("INFO", "Duplicate Asaas webhook skipped", { dedupKey });
        return res.json({ received: true });
      }
      processedWebhookIds.add(dedupKey);

      if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
        await supabaseAdmin
          .from("invoices")
          .update({ status: "RECEIVED", payment_date: new Date().toISOString() })
          .eq("asaas_payment_id", payment.id);

        if (payment.customer) {
          await supabaseAdmin
            .from("tenants")
            .update({ status: "active" })
            .eq("asaas_customer_id", payment.customer);
        }
      } else if (event === "PAYMENT_OVERDUE") {
        await supabaseAdmin
          .from("invoices")
          .update({ status: "OVERDUE" })
          .eq("asaas_payment_id", payment.id);

        if (payment.customer) {
          await supabaseAdmin
            .from("tenants")
            .update({ status: "blocked" })
            .eq("asaas_customer_id", payment.customer);
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      logEvent("ERROR", "Asaas Webhook processing failed", { error: error.message });
      res.status(500).json({ error: "Webhook error" });
    }
  });

  // ── LGPD Endpoints ──────────────────────────────────────────────

  // Export user data (LGPD Art. 18 - Portabilidade)
  app.get("/api/lgpd/export", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    try {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("*")
        .eq("tenant_id", profile?.tenant_id || "");

      logEvent("INFO", "LGPD data export requested", { userId });
      res.json({
        exportedAt: new Date().toISOString(),
        profile,
        patients: patients || [],
      });
    } catch (error: any) {
      logEvent("ERROR", "LGPD export failed", { error: error.message, userId });
      res.status(500).json({ error: "Falha ao exportar dados." });
    }
  });

  // Delete user data (LGPD Art. 18 - Eliminacao)
  app.delete("/api/lgpd/delete", requireAuth, async (req, res) => {
    const userId = (req as any).userId;
    try {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();

      if (!profile) {
        return res.status(404).json({ error: "Perfil nao encontrado." });
      }

      await supabaseAdmin.from("user_profiles").delete().eq("id", userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      logEvent("INFO", "LGPD account deletion completed", { userId });
      res.json({ success: true, message: "Conta e dados pessoais removidos com sucesso." });
    } catch (error: any) {
      logEvent("ERROR", "LGPD deletion failed", { error: error.message, userId });
      res.status(500).json({ error: "Falha ao remover dados." });
    }
  });

  // Privacy policy endpoint
  app.get("/api/lgpd/privacy-policy", (_req, res) => {
    res.json({
      lastUpdated: "2026-07-28",
      company: "HomeCare Pro",
      dataController: "HomeCare Pro Tecnologia em Saude Ltda",
      dpoEmail: "privacidade@homecarepro.com.br",
      dataCollected: [
        "Dados de autenticacao (email, nome)",
        "Dados de saude de pacientes (diagnosticos, medicacoes, alergias)",
        "Dados de profissionais (CPF, registro profissional)",
        "Dados de localizacao durante check-in/check-out",
      ],
      legalBases: [
        "Execucao de contrato de prestacao de servicos de saude domiciliar",
        "Consentimento do titular dos dados",
        "Obrigacao legal e regulatoria (ANS, CFM, COREN)",
      ],
      dataRetention: "Dados saude: minimo 20 anos (CFM 1.821/2007). Dados operacionais: 5 anos. Dados de marketing: ate revogacao do consentimento.",
      rights: [
        "Confirmacao da existencia de tratamento",
        "Acesso aos dados",
        "Correcao de dados incompletos ou desatualizados",
        "Anonimizacao, bloqueio ou eliminacao de dados desnecessarios",
        "Portabilidade dos dados",
        "Eliminacao dos dados tratados com consentimento",
        "Informacao sobre compartilhamento de dados",
        "Revogacao do consentimento",
      ],
      internationalTransfers: "Dados podem ser transferidos para servidores nos EUA (Supabase, Google Cloud) com garantias contratuais de protecao.",
    });
  });

  return app;
}

// ── Helpers ──────────────────────────────────────────────────────
export function getAge(birthDateString: string) {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function logEvent(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else if (level === "WARN") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
