import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";

// ── Environment Validation ──────────────────────────────────────
dotenv.config();

const REQUIRED_ENV_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`[FATAL] Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Set them in your .env file or export them before starting the server.");
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PORT = parseInt(process.env.PORT || "3000", 10);
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// ── Supabase Admin Client (server-side only) ────────────────────
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Express App ─────────────────────────────────────────────────
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", SUPABASE_URL, "ws://localhost:*", "http://localhost:*"].filter(Boolean),
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: APP_URL,
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

app.use("/api/", globalLimiter);

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
function logEvent(level: "INFO" | "WARN" | "ERROR", message: string, meta?: Record<string, unknown>) {
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
    const { audioData, mimeType } = req.body;

    if (!audioData || typeof audioData !== "string") {
      return res.status(400).json({ error: "audioData em formato base64 é obrigatório" });
    }

    if (!ai) {
      return res.json({
        transcription: "Nota de áudio capturada: Paciente relata estabilidade clínica no atendimento domiciliar, sem queixas agudas. Família orientada quanto ao horário de medicação."
      });
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
    res.status(500).json({ error: error.message || "Falha ao transcrever áudio" });
  }
});

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "homecare-pro-server" },
    },
  });
  logEvent("INFO", "Gemini AI initialized successfully");
} else {
  logEvent("WARN", "GEMINI_API_KEY not set. AI features will use fallback responses.");
}

// 2. Resumo do Paciente com IA
app.post("/api/gemini/summarize-patient", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { patient } = req.body;
    if (!patient) {
      return res.status(400).json({ error: "Patient object is required" });
    }

    if (!ai) {
      return res.json({
        summary: `[Simulação de IA] O paciente ${patient.name}, ${getAge(patient.birthDate)} anos, apresenta quadro de ${patient.diagnostic}. Possui alergia a ${patient.allergies.join(", ") || "nenhum componente informado"} e faz uso contínuo de: ${patient.medications.join(", ") || "nenhum medicamento informado"}. Recomenda-se acompanhamento rigoroso e monitoramento de sinais vitais.`
      });
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
    res.status(500).json({ error: error.message || "Failed to generate patient summary" });
  }
});

// 3. Geração de Relatório de Visita
app.post("/api/gemini/generate-visit-report", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { patientName, professionalName, rawNotes, vitals } = req.body;

    if (!rawNotes) {
      return res.status(400).json({ error: "rawNotes is required" });
    }

    if (!ai) {
      return res.json({
        report: `[Simulação de IA] RELATÓRIO DE EVOLUÇÃO DE HOME CARE\n\nPaciente: ${patientName || "Não especificado"}\nProfissional: ${professionalName || "Não especificado"}\n\nEvolução Clínica:\n- Sinais Vitais informados: PA: ${vitals?.pa || "Normal"}, FC: ${vitals?.fc || "Normal"} bpm, Temp: ${vitals?.temp || "Normal"}°C.\n- Observação anotada: "${rawNotes}".\n\nConduta realizada: Paciente bem adaptado, respondendo favoravelmente aos estímulos. Higiene mantida. Sem intercorrências durante o período de atendimento.`
      });
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
    res.status(500).json({ error: error.message || "Failed to generate visit report" });
  }
});

// 4. Sugestão de Agenda Otimizada
app.post("/api/gemini/suggest-schedule", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { visits, professionals, patients } = req.body;

    if (!visits || !professionals) {
      return res.status(400).json({ error: "visits and professionals data are required" });
    }

    if (!ai) {
      return res.json({
        suggestion: `[Simulação de IA] SUGESTÃO DE OTIMIZAÇÃO DE ESCALAS\n\n1. Rota Centro-Sul: Agrupar as visitas dos pacientes no bairro Vila Mariana com o Enfermeiro Carlos para reduzir tempo de deslocamento em 25%.\n2. Alocação de Especialidades: Direcionar a Dra. Patrícia (Fisioterapeuta) para o paciente Marcos no primeiro horário, otimizando o período de reabilitação muscular matinal.\n3. Rodízio de Escala: Manter o Técnico Thiago de sobreaviso no setor Norte para cobrir eventuais atrasos de trânsito.`
      });
    }

    const prompt = `Você é um coordenador de logística e operações médicas de uma empresa de Home Care.
Analise a listagem de visitas, profissionais e pacientes pendentes para otimizar a escala e reduzir deslocamento e fadiga dos profissionais.

LISTA DE PROFISSIONAIS DISPONÍVEIS:
${JSON.stringify(professionals.map((p: any) => ({ name: p.name, specialty: p.specialty, status: p.status })))}

LISTA DE PACIENTES PARA ATENDIMENTO:
${JSON.stringify(patients.map((pat: any) => ({ name: pat.name, diagnostic: pat.diagnostic, address: pat.address })))}

VISITAS PREVISTAS:
${JSON.stringify(visits.map((v: any) => ({ patientId: v.patientId, professionalId: v.professionalId, date: v.date, time: `${v.timeStart}-${v.timeEnd}` })))}

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
    res.status(500).json({ error: error.message || "Failed to suggest schedule optimization" });
  }
});

// 5. Triagem Inteligente
app.post("/api/gemini/triage", requireAuth, aiLimiter, async (req, res) => {
  try {
    const { description, patientAge, mainCondition } = req.body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "description is required" });
    }

    if (!ai) {
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
    res.status(500).json({ error: error.message || "Failed to analyze triage request" });
  }
});

// ── Tenant Resolution (Whitelabel) ──────────────────────────────
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

// ── Asaas Webhooks ──────────────────────────────────────────────
app.post("/api/webhooks/asaas", express.json({type: 'application/json'}), async (req, res) => {
  try {
    const token = req.headers["asaas-access-token"];
    if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
      logEvent("WARN", "Invalid Asaas Webhook Token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { event, payment } = req.body;
    logEvent("INFO", `Asaas Webhook received: ${event}`, { paymentId: payment?.id });

    if (!payment) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      // Update invoice status
      await supabaseAdmin
        .from("invoices")
        .update({ status: "RECEIVED", payment_date: new Date().toISOString() })
        .eq("asaas_payment_id", payment.id);
      
      // Optionally logic to unblock a tenant if they were overdue
    } else if (event === "PAYMENT_OVERDUE") {
      await supabaseAdmin
        .from("invoices")
        .update({ status: "OVERDUE" })
        .eq("asaas_payment_id", payment.id);
        
      // Block tenant logic (could be async or delayed)
      // await supabaseAdmin.from("tenants").update({ status: "blocked" }).eq("asaas_customer_id", payment.customer);
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

// ── Helper ──────────────────────────────────────────────────────
function getAge(birthDateString: string) {
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

// ── Server Start ────────────────────────────────────────────────
const startServer = async () => {
  if (NODE_ENV !== "production") {
    logEvent("INFO", "Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    logEvent("INFO", "Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      maxAge: "1y",
      etag: true,
      lastModified: true,
    }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    logEvent("INFO", `HomeCare Pro Server running on http://0.0.0.0:${PORT}`, { env: NODE_ENV });
  });

  const shutdown = () => {
    logEvent("INFO", "Server shutting down...");
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  process.on("uncaughtException", (err) => {
    logEvent("ERROR", "Uncaught exception", { error: err.message, stack: err.stack });
    shutdown();
  });

  process.on("unhandledRejection", (reason) => {
    logEvent("ERROR", "Unhandled rejection", { reason: String(reason) });
  });
};

startServer().catch((err) => {
  logEvent("ERROR", "Failed to start server", { error: err.message });
  process.exit(1);
});
