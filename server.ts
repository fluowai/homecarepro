import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK with server-side API Key
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY not defined in environment variables. AI features will fallback to local simulated responses.");
}

// 1. API: Resumo do Paciente com IA
app.post("/api/gemini/summarize-patient", async (req, res) => {
  try {
    const { patient } = req.body;
    if (!patient) {
      return res.status(400).json({ error: "Patient object is required" });
    }

    if (!ai) {
      // Simulated response in case API key is missing
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error in summarize-patient:", error);
    res.status(500).json({ error: error.message || "Failed to generate patient summary" });
  }
});

// 2. API: Geração de Relatório de Visita
app.post("/api/gemini/generate-visit-report", async (req, res) => {
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (error: any) {
    console.error("Error in generate-visit-report:", error);
    res.status(500).json({ error: error.message || "Failed to generate visit report" });
  }
});

// 3. API: Sugestão de Agenda Otimizada
app.post("/api/gemini/suggest-schedule", async (req, res) => {
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
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ suggestion: response.text });
  } catch (error: any) {
    console.error("Error in suggest-schedule:", error);
    res.status(500).json({ error: error.message || "Failed to suggest schedule optimization" });
  }
});

// Helper for calculating age
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

// Vite or static file serving
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[HomeCare Pro Server] running on http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error("Failed to start HomeCare Pro server:", err);
});
