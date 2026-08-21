import express from "express";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import { promises as dnsImpl } from "node:dns";
import { z } from "zod";
import { sendInviteEmail } from "./utils/mailer";

const PUBLIC_VAPID_KEY = process.env.VITE_PUBLIC_VAPID_KEY || "";
const PRIVATE_VAPID_KEY = process.env.PRIVATE_VAPID_KEY || "";

let pushConfigured = false;
if (PUBLIC_VAPID_KEY && PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails("https://homecare.wootech.com.br", PUBLIC_VAPID_KEY, PRIVATE_VAPID_KEY);
  pushConfigured = true;
}

async function sendPushNotification(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: any) {
  if (!pushConfigured) return { success: false, error: "VAPID keys not configured" };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      return { success: false, error: "Subscription expired", expired: true };
    }
    return { success: false, error: err.message };
  }
}

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

const emailTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['system', 'tenant']).optional().default('tenant'),
  description: z.string().optional(),
  subject: z.string().min(1),
  htmlContent: z.string().min(1),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const emailTemplateUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  subject: z.string().min(1).optional(),
  htmlContent: z.string().min(1).optional(),
  textContent: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
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
  appBaseDomain?: string;
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
    appBaseDomain = "localhost",
    enableRateLimit = true,
    dns: dnsClient,
  } = options;

  const dns = dnsClient ?? dnsImpl;

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
  const APP_BASE_DOMAIN = appBaseDomain || process.env.APP_BASE_DOMAIN || "homecare.wootech.com.br";

  const RESERVED_SUBDOMAINS = new Set([
    'admin', 'api', 'app', 'system', 'www', 'mail', 'ftp', 'ns',
    'dashboard', 'login', 'cdn', 'status', 'blog', 'docs', 'help',
    'support', 'secure', 'checkout', 'pay', 'billing',
  ]);

  function extractSubdomain(hostname: string): string | null {
    const normalizedBase = APP_BASE_DOMAIN.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    const cleanHost = hostname.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (cleanHost === normalizedBase || cleanHost === `www.${normalizedBase}`) {
      return null;
    }

    if (cleanHost.endsWith(`.${normalizedBase}`)) {
      const sub = cleanHost.slice(0, -(normalizedBase.length + 1));
      if (sub && sub !== 'www' && !sub.includes('.')) {
        return sub;
      }
    }

    if (process.env.NODE_ENV === 'development' && (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1'))) {
      const parts = cleanHost.split(':')[0].split('.');
      if (parts.length > 1 && parts[0] !== 'localhost') {
        return parts[0];
      }
    }

    return null;
  }

  function slugifySubdomain(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 63);
  }

  // ── Default System Email Templates ──────────────────────────────
  const DEFAULT_TEMPLATES = [
    {
      id: 'tpl-system-invite',
      tenant_id: null,
      type: 'system',
      name: 'invite',
      description: 'E-mail de convite para novo usuário acessar o sistema',
      subject: '{{role_name}} — Você foi convidado para acessar o HomeCare Pro',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
    <div style="width: 48px; height: 48px; background: #dcfce8; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #16a34a;">
        <path d="M14.5 2v4h4l-5 5V2z"/>
        <path d="M4 14l6 6 10-10"/>
      </svg>
    </div>
    <h1 style="color: #0f172a; margin: 0; font-size: 20px;">HomeCare Pro</h1>
  </div>
  <h2 style="color: #0f172a;">Bem-vindo ao HomeCare Pro!</h2>
  <p style="color: #334155; font-size: 16px; line-height: 1.6;">
    Você foi convidado por <strong>{{inviter_name}}</strong> para acessar o sistema como <strong>{{role_name}}</strong>.
  </p>
  <p style="color: #334155; font-size: 16px; line-height: 1.6;">
    Clique no botão abaixo para aceitar o convite e configurar seu acesso inicial:
  </p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{invite_link}}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Aceitar Convite
    </a>
  </div>
  <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
    Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
    <a href="{{invite_link}}" style="color: #2563eb; word-break: break-all;">{{invite_link}}</a>
  </p>
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    {{inviter_name}}<br/>
    Este é um e-mail automático, por favor não responda.
  </p>
</div>`,
      variables: ['inviter_name', 'role_name', 'invite_link'],
      is_default: true,
    },
    {
      id: 'tpl-system-appointment_reminder',
      tenant_id: null,
      type: 'system',
      name: 'appointment_reminder',
      description: 'Lembrete de visita agendada ao paciente/familiar',
      subject: 'Lembrete: Visita de hoje com {{professional_name}} às {{appointment_time}}',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
  <h2 style="color: #0f172a;">Lembrete de Consulta</h2>
  <p style="color: #334155; font-size: 16px;">Olá {{patient_name}}, lembramos que sua visita de enfermagem está agendada para hoje.</p>
  <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Data:</strong> {{appointment_date}}</p>
    <p style="margin: 4px 0;"><strong>Horário:</strong> {{appointment_time}}</p>
    <p style="margin: 4px 0;"><strong>Profissional:</strong> {{professional_name}}</p>
    <p style="margin: 4px 0;"><strong>Clínica:</strong> {{clinic_name}}</p>
  </div>
  <p style="color: #64748b; font-size: 14px;">Em caso de impossibilidade, favor avisar com antecedência.</p>
</div>`,
      variables: ['patient_name', 'professional_name', 'appointment_date', 'appointment_time', 'clinic_name'],
      is_default: true,
    },
    {
      id: 'tpl-system-visit_confirmation',
      tenant_id: null,
      type: 'system',
      name: 'visit_confirmation',
      description: 'Confirmação de visita concluída ao paciente/familiar',
      subject: 'Visita concluída — {{patient_name}} em {{visit_date}}',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
  <h2 style="color: #0f172a;">Visita Concluída com Sucesso</h2>
  <p style="color: #334155; font-size: 16px;">Olá {{patient_name}}, informamos que o atendimento de hoje foi concluído com sucesso.</p>
  <p style="color: #334155; font-size: 16px;">{{report_summary}}</p>
  <p style="color: #64748b; font-size: 14px;">Os dados estão atualizados no prontuário digital.</p>
</div>`,
      variables: ['patient_name', 'visit_date', 'professional_name', 'report_summary'],
      is_default: true,
    },
    {
      id: 'tpl-system-survey_request',
      tenant_id: null,
      type: 'system',
      name: 'survey_request',
      description: 'Solicitação de pesquisa de satisfação após visita',
      subject: 'Como foi seu atendimento de hoje, {{patient_name}}?',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
  <h2 style="color: #0f172a;">Pesquisa de Satisfação</h2>
  <p style="color: #334155; font-size: 16px;">Olá {{patient_name}}, gostaríamos de saber como foi o atendimento com {{professional_name}}.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{survey_link}}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
      Avaliar Atendimento
    </a>
  </div>
  <p style="color: #64748b; font-size: 14px;">Sua opinião ajuda a melhorar nossa qualidade de atendimento.</p>
</div>`,
      variables: ['patient_name', 'professional_name', 'survey_link'],
      is_default: true,
    },
  ];

  async function seedDefaultTemplates() {
    try {
      const { data: existing } = await supabaseAdmin.from('email_templates').select('id').not('id', 'like', 'tpl-%');
      if (existing && existing.length > 0) return;

      const now = new Date().toISOString();
      const rows = DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        is_active: true,
        is_default: true,
        variables: t.variables || [],
        created_at: now,
        updated_at: now,
      }));

      const { error } = await supabaseAdmin.from('email_templates').upsert(rows, { onConflict: 'id' });
      if (error) {
        console.error('[Seed] Failed to seed email templates:', error.message);
      } else {
        logEvent('INFO', 'Default email templates seeded', { count: rows.length });
      }
    } catch (err: any) {
      console.error('[Seed] Error seeding templates:', err.message);
    }
  }

  void seedDefaultTemplates();

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
        mediaSrc: ["'self'", "blob:"],
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
      const statusCode = error?.status || error?.statusCode || 500;
      const apiDetails = error?.response?.data || error?.error?.details || error?.details;
      logEvent("ERROR", "Audio transcription failed", {
        error: error.message,
        stack: error.stack,
        statusCode,
        apiDetails,
        userId: (req as any).userId,
      });
      const clientMessage = apiDetails
        ? `Falha ao transcrever áudio: ${error.message}`
        : "Falha ao transcrever áudio.";
      res.status(statusCode).json({ error: clientMessage, ...(apiDetails ? { details: apiDetails } : {}) });
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
       const { customDomain, primaryColor, secondaryColor, logo, subdomain, tenantId } = req.body;

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

      // Validate and resolve subdomain
      let resolvedSubdomain = subdomain;
      if (subdomain !== undefined) {
        resolvedSubdomain = (subdomain || "").trim().toLowerCase();
        if (resolvedSubdomain) {
          const subClean = slugifySubdomain(resolvedSubdomain);
          if (!subClean || RESERVED_SUBDOMAINS.has(subClean) || subClean !== resolvedSubdomain) {
            return res.status(400).json({ error: "Subdomínio inválido. Use apenas letras, números e hífen (não inicie/finalise com hífen). Valores reservados não são permitidos." });
          }
          resolvedSubdomain = subClean;
          const { data: existing } = await supabaseAdmin
            .from("tenants")
            .select("id")
            .eq("subdomain", resolvedSubdomain)
            .neq("id", targetTenantId)
            .maybeSingle();
          if (existing) {
            return res.status(400).json({ error: `Subdomínio "${resolvedSubdomain}" já está em uso por outra conta.` });
          }
        }
      }

      const updateData: Record<string, unknown> = {
        custom_domain: customDomain || null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        logo: logo || null,
        subdomain: resolvedSubdomain !== undefined ? (resolvedSubdomain || null) : undefined,
      };
      // Remove undefined keys so we don't overwrite with undefined
      Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k]);

      const { error } = await supabaseAdmin
        .from("tenants")
        .update(updateData)
        .eq("id", targetTenantId);

      if (error) throw error;

      logEvent("INFO", "Tenant config updated", { targetTenantId, customDomain, subdomain: resolvedSubdomain });
      res.json({ success: true, subdomain: resolvedSubdomain });
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
        .select("id, name, logo, primary_color, secondary_color, status, custom_domain, subdomain")
        .eq("custom_domain", domain)
        .single();

      // If not found by custom_domain, try to resolve by subdomain
      if (!tenant) {
        const subdomain = extractSubdomain(domain);
        if (subdomain) {
          const { data: subTenant } = await supabaseAdmin
            .from("tenants")
            .select("id, name, logo, primary_color, secondary_color, status, custom_domain, subdomain")
            .eq("subdomain", subdomain)
            .single();
          if (subTenant) {
            tenant = subTenant;
          }
        }
      }

      // Fallback to system tenant
      if (!tenant) {
        const { data: defaultTenant } = await supabaseAdmin
          .from("tenants")
          .select("id, name, logo, primary_color, secondary_color, status, custom_domain, subdomain")
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
      res.status(500).json({ error: "Failed to resolve tenant" });
    }
   });

  // ── Email Templates API ─────────────────────────────────────────────
  // GET /api/email-templates — list templates visible to the authenticated user
  //   Mega admin: all system templates
  //   Super admin: system + their reseller tenant templates
  //   Admin: system + their clinic tenant templates
  app.get("/api/email-templates", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile) {
        return res.status(401).json({ error: "Perfil de usuário não encontrado." });
      }

      if (profile.role === "mega_admin") {
        const { data, error } = await supabaseAdmin
          .from("email_templates")
          .select("*")
          .is("tenant_id", null);
        if (error) throw error;
        return res.json(data || []);
      }

      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .select("*")
        .or(`tenant_id.eq.${profile.tenant_id},and(type.eq.system,tenant_id.is.null)`);
      if (error) throw error;
      return res.json(data || []);
    } catch (error: any) {
      logEvent("ERROR", "Failed to list email templates", { userId: (req as any).userId, error: error.message });
      res.status(500).json({ error: "Falha ao listar templates de e-mail." });
    }
  });

  // POST /api/email-templates — create a new template (mega_admin only for system templates, super_admin for tenant templates)
  app.post("/api/email-templates", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const result = emailTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }

      const isSystem = profile.role === "mega_admin" && result.data.type === "system";
      const templateId = `tpl-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin.from("email_templates").insert({
        id: templateId,
        tenant_id: isSystem ? null : profile.tenant_id,
        type: isSystem ? "system" : "tenant",
        name: result.data.name,
        description: result.data.description || null,
        subject: result.data.subject,
        html_content: result.data.htmlContent,
        text_content: result.data.textContent || null,
        variables: result.data.variables || [],
        is_active: result.data.isActive ?? true,
        is_default: false,
        created_at: now,
        updated_at: now,
      }).select().single();

      if (error) throw error;
      logEvent("INFO", "Email template created", { userId, templateId, name: result.data.name });
      res.status(201).json(data);
    } catch (error: any) {
      logEvent("ERROR", "Failed to create email template", { userId: (req as any).userId, error: error.message });
      res.status(500).json({ error: "Falha ao criar template de e-mail." });
    }
  });

  // PUT /api/email-templates/:id — update a template
  app.put("/api/email-templates/:id", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { id } = req.params;
      const result = emailTemplateUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Validation error", details: result.error.errors });
      }

      const { data: existing } = await supabaseAdmin
        .from("email_templates")
        .select("tenant_id, type")
        .eq("id", id)
        .single();

      if (!existing) {
        return res.status(404).json({ error: "Template não encontrado." });
      }

      // mega_admin can edit any template; super_admin can only edit their own tenant templates
      if (profile.role === "super_admin") {
        if (existing.tenant_id !== profile.tenant_id && existing.type === "system") {
          return res.status(403).json({ error: "Você não pode editar templates do sistema." });
        }
      }

      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (result.data.name !== undefined) update.name = result.data.name;
      if (result.data.description !== undefined) update.description = result.data.description || null;
      if (result.data.subject !== undefined) update.subject = result.data.subject;
      if (result.data.htmlContent !== undefined) update.html_content = result.data.htmlContent;
      if (result.data.textContent !== undefined) update.text_content = result.data.textContent || null;
      if (result.data.variables !== undefined) update.variables = result.data.variables;
      if (result.data.isActive !== undefined) update.is_active = result.data.isActive;

      const { data, error } = await supabaseAdmin
        .from("email_templates")
        .update(update)
        .eq("id", id)
        .select().single();

      if (error) throw error;
      logEvent("INFO", "Email template updated", { userId, templateId: id });
      res.json(data);
    } catch (error: any) {
      logEvent("ERROR", "Failed to update email template", { userId: (req as any).userId, error: error.message });
      res.status(500).json({ error: "Falha ao atualizar template de e-mail." });
    }
  });

  // DELETE /api/email-templates/:id — delete a template (mega_admin only, or own tenant templates)
  app.delete("/api/email-templates/:id", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || (profile.role !== "mega_admin" && profile.role !== "super_admin")) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { id } = req.params;
      const { data: existing } = await supabaseAdmin
        .from("email_templates")
        .select("tenant_id, type, is_default")
        .eq("id", id)
        .single();

      if (!existing) {
        return res.status(404).json({ error: "Template não encontrado." });
      }

      if (existing.is_default) {
        return res.status(400).json({ error: "Templates padrão não podem ser excluídos." });
      }

      if (profile.role === "super_admin" && existing.type === "system") {
        return res.status(403).json({ error: "Você não pode excluir templates do sistema." });
      }

      const { error } = await supabaseAdmin.from("email_templates").delete().eq("id", id);
      if (error) throw error;
      logEvent("INFO", "Email template deleted", { userId, templateId: id });
      res.json({ success: true });
    } catch (error: any) {
      logEvent("ERROR", "Failed to delete email template", { userId: (req as any).userId, error: error.message });
      res.status(500).json({ error: "Falha ao excluir template de e-mail." });
    }
  });

  // POST /api/email-templates/render — render a template with variables (for preview/test)
  app.post("/api/email-templates/render", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile) {
        return res.status(401).json({ error: "Perfil de usuário não encontrado." });
      }

      const { templateId, variables = {} } = req.body as { templateId?: string; variables?: Record<string, string> };

      let query = supabaseAdmin.from("email_templates").select("*", { single: true });
      if (templateId) {
        query = query.eq("id", templateId);
      } else {
        const { name } = req.body as { name?: string };
        if (!name) return res.status(400).json({ error: "templateId ou name é obrigatório." });
        query = query.eq("name", name);
      }

      const { data: tmpl, error } = await query;
      if (error || !tmpl) {
        return res.status(404).json({ error: "Template não encontrado." });
      }

      const renderVar = (content: string, vars: Record<string, string>): string =>
        content.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
          const k = key.trim();
          return vars[k] !== undefined ? vars[k] : `{{${key}}}`;
        });

      const rendered = {
        subject: renderVar(tmpl.subject, variables),
        html: renderVar(tmpl.html_content, variables),
        text: tmpl.text_content ? renderVar(tmpl.text_content, variables) : undefined,
      };

      res.json(rendered);
    } catch (error: any) {
      logEvent("ERROR", "Failed to render email template", { userId: (req as any).userId, error: error.message });
      res.status(500).json({ error: "Falha ao renderizar template." });
    }
  });

  // ── File Uploads (MinIO) ─────────────────────────────────────────
  app.post("/api/upload/presigned-url", requireAuth, globalLimiter, async (req, res) => {
    try {
      const { fileName, mimeType } = req.body;
      if (!fileName || !mimeType) {
        return res.status(400).json({ error: "fileName and mimeType are required" });
      }

      // Dynamic import to avoid breaking test environments that don't have MinIO
      const { getUploadPresignedUrl } = await import("./minio");
      
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${Date.now()}-${safeName}`;
      
      const { uploadUrl, publicUrl } = await getUploadPresignedUrl(uniqueFileName, mimeType);

      res.json({ uploadUrl, publicUrl });
    } catch (error: any) {
      console.error("[Upload] Error generating presigned URL:", error);
      res.status(500).json({ error: "Falha ao gerar URL de upload." });
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

      const { name, cnpj, plan, logo, customDomain, primaryColor, secondaryColor, subdomain, adminEmail, adminName, parentId } = req.body;
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

      // Resolve subdomain: use provided or auto-generate from name
      let resolvedSubdomain = (subdomain || "").trim().toLowerCase();
      if (resolvedSubdomain) {
        const subClean = slugifySubdomain(resolvedSubdomain);
        if (!subClean || RESERVED_SUBDOMAINS.has(subClean) || subClean !== resolvedSubdomain) {
          return res.status(400).json({ error: "Subdomínio inválido. Use apenas letras, números e hífen (não inicie/finalise com hífen). Valores reservados não são permitidos." });
        }
        resolvedSubdomain = subClean;
        // Check uniqueness
        const { data: existing } = await supabaseAdmin
          .from("tenants")
          .select("id")
          .eq("subdomain", resolvedSubdomain)
          .maybeSingle();
        if (existing) {
          return res.status(400).json({ error: `Subdomínio "${resolvedSubdomain}" já está em uso.` });
        }
      } else {
        // Auto-generate from name
        resolvedSubdomain = slugifySubdomain(name);
        if (!resolvedSubdomain || RESERVED_SUBDOMAINS.has(resolvedSubdomain)) {
          resolvedSubdomain = `tenant-${Date.now().toString(36)}`;
        }
        // Ensure uniqueness with suffix
        let tries = 0;
        let unique = resolvedSubdomain;
        while (tries < 20) {
          const { data: existing } = await supabaseAdmin
            .from("tenants")
            .select("id")
            .eq("subdomain", unique)
            .maybeSingle();
          if (!existing) break;
          tries++;
          unique = `${resolvedSubdomain}-${tries}`;
        }
        resolvedSubdomain = unique;
      }

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
        subdomain: resolvedSubdomain,
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

      const inviteLink = `${appUrl}/?invite=${token}`;
      
      // Enviar email transacional (não bloqueia a resposta, dispara em background)
      sendInviteEmail(supabaseAdmin, adminEmail, inviteLink, inviteRole, "Sistema HomeCare Pro").catch(err => console.error("Async email error", err));

      logEvent("INFO", "Tenant created with invitation", { tenantId, role: inviteRole, createdBy: userId, adminName: adminName || "", subdomain: resolvedSubdomain });
      res.status(201).json({
        tenant: {
          id: tenantId,
          name,
          cnpj: cnpj || "",
          plan: plan || "Free",
          logo: logo || "",
          parentId: targetParent,
          status: "active",
          subdomain: resolvedSubdomain,
          customDomain: customDomain || undefined,
          primaryColor: primaryColor || undefined,
          secondaryColor: secondaryColor || undefined,
        },
        inviteLink: `${appUrl}/?invite=${token}`,
        tenantUrl: resolvedSubdomain ? `https://${resolvedSubdomain}.${APP_BASE_DOMAIN}` : undefined,
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

      const inviteLink = `${appUrl}/?invite=${token}`;
      sendInviteEmail(supabaseAdmin, adminEmail, inviteLink, inviteRole, "Sistema HomeCare Pro").catch(err => console.error("Async email error", err));

      logEvent("INFO", "Invite regenerated", { tenantId, role: inviteRole, adminName: adminName || "" });
      res.status(201).json({ inviteLink });
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

      const inviteLink = `${appUrl}/?invite=${token}`;
      sendInviteEmail(supabaseAdmin, String(email).toLowerCase(), inviteLink, targetRole, "Administração do Sistema").catch(err => console.error("Async email error", err));

      logEvent("INFO", "System team invite created", { email, role: targetRole, createdBy: userId });
      res.status(201).json({ inviteLink, email, role: targetRole });
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
        .select("id, tenant_id, email, role, status, expires_at, patient_id")
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
        patientId: invite.patient_id || undefined,
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
        .select("id, tenant_id, email, role, status, expires_at, patient_id")
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

      // If this is a family invite, create the patient-family link
      if (invite.role === 'family' && invite.patient_id && created?.user?.id) {
        await supabaseAdmin.from("patient_family_links").insert({
          tenant_id: invite.tenant_id,
          patient_id: invite.patient_id,
          family_user_id: created.user.id,
          relationship: 'responsável legal',
          is_primary: true,
        });
      }

      logEvent("INFO", "Invite accepted, account created", { userId: created?.user?.id, tenantId: invite.tenant_id, role: invite.role });
      res.status(201).json({ success: true, email: invite.email, role: invite.role });
    } catch (error: any) {
      logEvent("ERROR", "Invite accept failed", { error: error.message });
      res.status(500).json({ error: "Falha ao criar a conta." });
    }
  });

  // Public: check if an email has a pending invite (First Access flow)
  app.post("/api/auth/check-first-access", globalLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "E-mail obrigatório." });
      }

      const { data: invite, error } = await supabaseAdmin
        .from("tenant_invitations")
        .select("id, status, expires_at")
        .eq("email", email.toLowerCase().trim())
        .eq("status", "pending")
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (!invite || new Date(invite.expires_at).getTime() < Date.now()) {
        return res.json({ hasPendingInvite: false });
      }

      res.json({ hasPendingInvite: true });
    } catch (error: any) {
      logEvent("ERROR", "Check first access failed", { error: error.message });
      res.status(500).json({ error: "Falha ao verificar convite pendente." });
    }
  });

  // Public: accept an invite by email directly (First Access flow)
  app.post("/api/invites/accept-by-email", authLimiter, async (req, res) => {
    try {
      const { email, fullName, password } = req.body;
      if (!email || !fullName || !password) {
        return res.status(400).json({ error: "Preencha todos os campos." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data: invite, error } = await supabaseAdmin
        .from("tenant_invitations")
        .select("id, tenant_id, role, status, expires_at, patient_id")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .maybeSingle();

      if (error) throw error;
      if (!invite) {
        return res.status(404).json({ error: "Nenhum convite pendente encontrado para este e-mail." });
      }
      if (new Date(invite.expires_at).getTime() < Date.now()) {
        return res.status(410).json({ error: "Convite expirado. Solicite um novo à administração." });
      }

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
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
          return res.status(409).json({ error: "Já existe uma conta com este e-mail. Se esqueceu a senha, utilize a opção de recuperação." });
        }
        throw createError;
      }

      await supabaseAdmin.from("tenant_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);

      // If this is a family invite, create the patient-family link
      if (invite.role === 'family' && invite.patient_id && created?.user?.id) {
        await supabaseAdmin.from("patient_family_links").insert({
          tenant_id: invite.tenant_id,
          patient_id: invite.patient_id,
          family_user_id: created.user.id,
          relationship: 'responsável legal',
          is_primary: true,
        });
      }

      logEvent("INFO", "Invite accepted by email (First Access)", { userId: created?.user?.id, tenantId: invite.tenant_id, role: invite.role });
      res.status(201).json({ success: true, email: normalizedEmail, role: invite.role });
    } catch (error: any) {
      logEvent("ERROR", "Accept by email failed", { error: error.message });
      res.status(500).json({ error: "Falha ao criar a conta no primeiro acesso." });
    }
  });

  // ── Caddy On-Demand TLS Check ────────────────────────────────────
  app.get("/api/internal/caddy-ask", async (req, res) => {
    try {
      const domain = req.query.domain as string;
      if (!domain) {
        return res.status(400).send("Missing domain");
      }

      // Always allow the main domain, base domain, and localhost
      const normalizedDomain = domain.toLowerCase().trim();
      if (normalizedDomain === APP_BASE_DOMAIN || domain.includes("localhost")) {
        return res.status(200).send("OK");
      }

      // Check if any active tenant has this custom domain
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, status")
        .eq("custom_domain", normalizedDomain)
        .single();

      if (tenant && tenant.status === "active") {
        return res.status(200).send("OK");
      }

      // Check if domain is a valid subdomain of the base domain
      const subdomain = extractSubdomain(normalizedDomain);
      if (subdomain) {
        const { data: subTenant } = await supabaseAdmin
          .from("tenants")
          .select("id, status")
          .eq("subdomain", subdomain)
          .single();

        if (subTenant && subTenant.status === "active") {
          return res.status(200).send("OK");
        }
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

  // ── Family Role & Patient-Family Links ───────────────────────────────

  // Invite a family member to a specific patient (admin/operator/professional only)
  app.post("/api/patient-family-links", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || !['admin', 'operator', 'professional'].includes(profile.role)) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { patientId, familyEmail, relationship, isPrimary } = req.body;
      if (!patientId || !familyEmail) {
        return res.status(400).json({ error: "patientId and familyEmail are required." });
      }

      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("id, name, tenant_id")
        .eq("id", patientId)
        .maybeSingle();

      if (!patient) {
        return res.status(404).json({ error: "Paciente não encontrado." });
      }

      // Check the user has tenant access to this patient's tenant
      const hasAccess = await checkTenantAccess(supabaseAdmin, profile, patient.tenant_id);
      if (!hasAccess) {
        return res.status(403).json({ error: "Acesso negado ao paciente." });
      }

      // Create invitation with role 'family'
      const token = newInviteToken();
      const expiry = new Date(Date.now() + INVITE_TTL_MS).toISOString();

      const { error: inviteError } = await supabaseAdmin.from("tenant_invitations").insert({
        tenant_id: patient.tenant_id,
        email: String(familyEmail).toLowerCase().trim(),
        role: 'family',
        token,
        status: "pending",
        expires_at: expiry,
        created_by: userId,
        patient_id: patientId,
      });

      if (inviteError) throw inviteError;

      const inviteLink = `${appUrl}/?invite=${token}`;

      logEvent("INFO", "Family member invited", { tenantId: patient.tenant_id, patientId, familyEmail, createdBy: userId });

      // Send email with invite link (async)
      sendInviteEmail(String(familyEmail).toLowerCase(), inviteLink, 'family', `HomeCare Pro — convite para ${patient.name}`).catch(err => console.error("Async email error", err));

      res.status(201).json({ inviteLink, role: 'family' });
    } catch (error: any) {
      logEvent("ERROR", "Family invite failed", { error: error.message });
      res.status(500).json({ error: "Falha ao convidar familiar." });
    }
  });

  // List patients linked to the current family user (family role only)
  app.get("/api/patient-family-links/mine", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);

      if (!profile || profile.role !== 'family') {
        return res.status(403).json({ error: "Acesso negado. Apenas familiares podem listar seus pacientes." });
      }

      const { data: links, error } = await supabaseAdmin
        .from("patient_family_links")
        .select("*, patients(*)")
        .eq("family_user_id", userId);

      if (error) throw error;

      res.json({ links: links || [] });
    } catch (error: any) {
      logEvent("ERROR", "Family link fetch failed", { error: error.message });
      res.status(500).json({ error: "Falha ao buscar vínculos." });
    }
  });

  // Helper: check tenant access using has_tenant_access function
  async function checkTenantAccess(supabaseAdmin: SupabaseClient, profile: { role: string; tenant_id: string }, targetTenantId: string): Promise<boolean> {
    if (profile.role === 'mega_admin') return true;
    if (profile.tenant_id === targetTenantId) return true;
    if (profile.role === 'super_admin') {
      const { data: t, error } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("id", targetTenantId)
        .eq("parent_id", profile.tenant_id)
        .maybeSingle();
      return !error && !!t;
    }
    return false;
  }

  // ── Push Subscription ────────────────────────────────────────────────

  // Save or update the user's push subscription (called by frontend after grant)
  app.post("/api/push-subscription", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription payload." });
      }

      const profile = await getProfile(userId);

      const { data: existing } = await supabaseAdmin
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      const row = {
        user_id: userId,
        tenant_id: profile?.tenant_id || "",
        endpoint,
        p256dh_key: keys.p256dh,
        auth_key: keys.auth,
        last_seen: new Date().toISOString(),
      };

      let error;
      if (existing) {
        ({ error } = await supabaseAdmin.from("push_subscriptions").update(row).eq("id", existing.id));
      } else {
        ({ error } = await supabaseAdmin.from("push_subscriptions").insert(row));
      }

      if (error) throw error;

      logEvent("INFO", "Push subscription saved", { userId });
      res.json({ success: true });
    } catch (error: any) {
      logEvent("ERROR", "Push subscription save failed", { error: error.message });
      res.status(500).json({ error: "Falha ao salvar subscription." });
    }
  });

  // ── Notifications ────────────────────────────────────────────────────

  // Send a notification + push to a specific user (tenant staff only)
  app.post("/api/notifications/send", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const profile = await getProfile(userId);
      if (!profile || !['admin', 'operator', 'professional', 'family'].includes(profile.role)) {
        return res.status(403).json({ error: "Acesso negado." });
      }

      const { targetUserId, title, body, type, severity, patientId } = req.body;
      if (!targetUserId || !title || !body) {
        return res.status(400).json({ error: "targetUserId, title and body are required." });
      }

      const targetProfile = await getProfile(targetUserId);
      if (!targetProfile || !checkTenantAccessForProfile(supabaseAdmin, profile, targetProfile.tenant_id)) {
        return res.status(403).json({ error: "Não autorizado a notificar este usuário." });
      }

      // Persist notification
      const { data: notif, error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          tenant_id: targetProfile.tenant_id,
          user_id: targetUserId,
          patient_id: patientId || null,
          title,
          body,
          type: type || 'system',
          severity: severity || 'info',
          is_read: false,
          is_delivered: false,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Fetch push subscriptions for the target user and send push
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh_key, auth_key")
        .eq("user_id", targetUserId);

      const expiredSubs: string[] = [];

      if (subs && subs.length > 0) {
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            { title, body, type, severity, patientId, url: `/${type === 'visit' ? 'checkin' : type === 'message' ? 'communication' : 'alerts'}` }
          );
          if (result.success) {
            // mark delivered
            await supabaseAdmin.from("notifications").update({ is_delivered: true }).eq("id", notif.id);
          } else if (result.expired) {
            expiredSubs.push(sub.endpoint);
          }
        }
      }

      // Clean up expired subscriptions
      if (expiredSubs.length > 0) {
        await supabaseAdmin.from("push_subscriptions").delete().in('endpoint', expiredSubs);
      }

      logEvent("INFO", "Notification sent", { targetUserId, tenantId: targetProfile.tenant_id, type, severity });
      res.json({ success: true, notificationId: notif.id, pushSent: (subs?.length || 0) > 0 });
    } catch (error: any) {
      logEvent("ERROR", "Notification send failed", { error: error.message });
      res.status(500).json({ error: "Falha ao enviar notificação." });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const notifId = (req.params as any).id;
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notifId)
        .eq("user_id", userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao marcar como lida." });
    }
  });

  // Get unread notifications for current user
  app.get("/api/notifications/unread", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      res.json({ notifications: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: "Falha ao buscar notificações." });
    }
  });

  // Expose VAPID public key for frontend
  app.get("/api/notifications/vapid-key", globalLimiter, (_req, res) => {
    res.json({ publicKey: PUBLIC_VAPID_KEY });
  });

  // ── Internal: Send notification to family members of a patient ──────
  // Called by other endpoints (e.g., check-in, alerts) to fan-out
  async function notifyFamilyMembers(patientId: string, payload: { title: string; body: string; type: string; severity: string }, originTenantId: string) {
    if (!pushConfigured) {
      logEvent("WARN", "Push not configured, skipping family notification", { patientId });
      return;
    }

    try {
      const { data: links } = await supabaseAdmin
        .from("patient_family_links")
        .select("family_user_id")
        .eq("patient_id", patientId)
        .eq("tenant_id", originTenantId);

      if (!links || links.length === 0) return;

      for (const link of links) {
        const { data: notif, error: notifError } = await supabaseAdmin
          .from("notifications")
          .insert({
            tenant_id: originTenantId,
            user_id: link.family_user_id,
            patient_id: patientId,
            title: payload.title,
            body: payload.body,
            type: payload.type as any,
            severity: payload.severity as any,
            is_read: false,
            is_delivered: false,
          })
          .select()
          .single();

        if (notifError) {
          logEvent("ERROR", "Notification persist failed", { error: notifError.message, patientId, familyUserId: link.family_user_id });
          continue;
        }

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh_key, auth_key")
          .eq("user_id", link.family_user_id);

        if (subs && subs.length > 0) {
          for (const sub of subs) {
            const result = await sendPushNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
              { title: payload.title, body: payload.body, type: payload.type, severity: payload.severity, patientId, url: '/alerts' }
            );
            if (result.success) {
              await supabaseAdmin.from("notifications").update({ is_delivered: true }).eq("id", notif.id);
            } else if (result.expired) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }
        }
      }

      logEvent("INFO", "Family notifications sent", { patientId, count: links.length });
    } catch (error: any) {
      logEvent("ERROR", "Family notification fan-out failed", { error: error.message, patientId });
    }
  }

  // Expose notifyFamilyMembers via module-level (for use in other endpoints within createApp)
  app.locals.notifyFamilyMembers = notifyFamilyMembers;

  function checkTenantAccessForProfile(supabaseAdmin: SupabaseClient, profile: { role: string; tenant_id: string }, targetTenantId: string): boolean {
    if (profile.role === 'mega_admin') return true;
    if (profile.tenant_id === targetTenantId) return true;
    if (profile.role === 'super_admin') return true;
    return false;
  }

  // ── Auto notification triggers ──────────────────────────────────────
  // Called by frontend when key events happen to fan out to family members

  app.post("/api/notifications/trigger", requireAuth, globalLimiter, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { eventType, patientId, message } = req.body;
      if (!eventType || !patientId) {
        return res.status(400).json({ error: "eventType and patientId are required." });
      }

      const { data: patient } = await supabaseAdmin
        .from("patients")
        .select("id, name, tenant_id")
        .eq("id", patientId)
        .maybeSingle();

      if (!patient) {
        return res.status(404).json({ error: "Paciente não encontrado." });
      }

      let title: string;
      let body: string;
      let type: string;
      let severity: string;

      switch (eventType) {
        case 'visit_checkin':
          title = 'Profissional em Visita';
          body = message || `O profissional iniciou o atendimento em domicílio.`;
          type = 'visit';
          severity = 'info';
          break;
        case 'visit_checkout':
          title = 'Visita Concluída';
          body = message || `O atendimento foi finalizado com sucesso. Veja o relatório no sistema.`;
          type = 'visit';
          severity = 'info';
          break;
        case 'clinical_alert':
          title = 'Alerta Clínico';
          body = message || `Nova solicitação de atenção para o paciente.`;
          type = 'clinical';
          severity = severity || 'warning';
          break;
        case 'new_message':
          title = 'Nova Mensagem';
          body = message || `Você recebeu uma nova mensagem da equipe.`;
          type = 'message';
          severity = 'info';
          break;
        default:
          return res.status(400).json({ error: "Unknown eventType." });
      }

      severity = req.body.severity || severity;

      const payload = { title, body, type, severity };
      await notifyFamilyMembers(patientId, payload, patient.tenant_id);

      res.json({ success: true, sentTo: 'family_members' });
    } catch (error: any) {
      logEvent("ERROR", "Auto notification trigger failed", { error: error.message });
      res.status(500).json({ error: "Falha ao disparar notificação." });
    }
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
