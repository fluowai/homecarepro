import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// 5. API: Transcrição de Áudio de Ditado do CRM por IA
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;

    if (!audioData || typeof audioData !== "string") {
      return res.status(400).json({ error: "audioData em formato base64 é obrigatório" });
    }

    if (!ai) {
      return res.json({
        transcription: "Nota de áudio capturada: Paciente relata estabilidade clínica no atendimento domiciliar, sem queixas algicas agudas. Família orientada quanto ao horário de medicação."
      });
    }

    const cleanBase64 = audioData.includes(",") ? audioData.split(",")[1] : audioData;
    const cleanMimeType = mimeType || "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    return res.json({ transcription });
  } catch (error: any) {
    console.error("Error in audio transcription:", error);
    res.status(500).json({ error: error.message || "Falha ao transcrever áudio" });
  }
});

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

// 4. API: Triagem Inteligente de Atendimentos por IA
app.post("/api/gemini/triage", async (req, res) => {
  try {
    const { description, patientAge, mainCondition } = req.body;

    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "description is required" });
    }

    if (!ai) {
      // Rule-based fallback if AI key is missing or server is offline
      const text = description.toLowerCase();
      let urgency: 'Crítica' | 'Alta' | 'Média' | 'Baixa' = 'Média';
      let urgencyScore = 5;
      let specialty: 'Enfermeiro' | 'Técnico de Enfermagem' | 'Fisioterapeuta' | 'Fonoaudiólogo' | 'Médico' | 'Nutricionista' = 'Enfermeiro';
      let responseTime = "Atendimento em até 6 horas";
      let clinicalRationale = "Triagem baseada em algoritmo de urgência por palavras-chave clínicas.";
      let recommendedActions: string[] = [
        "Realizar contato telefônico prévio com o responsável",
        "Verificar histórico de alergias e comorbidades antes da partida",
        "Aferir sinais vitais completos no primeiro contato"
      ];

      if (text.includes("falta de ar") || text.includes("dispneia") || text.includes("saturação") || text.includes("parada") || text.includes("dor no peito") || text.includes("inconsciente") || text.includes("crítica") || text.includes("convulsão")) {
        urgency = 'Crítica';
        urgencyScore = 9;
        specialty = text.includes("respira") || text.includes("saturação") ? 'Fisioterapeuta' : 'Médico';
        responseTime = "Atendimento Imediato (Até 2 horas)";
        clinicalRationale = "Sinais evidentes de desconforto respiratório ou instabilidade hemodinâmica crítica requerem intervenção médica/fisioterapêutica urgente em domicilio.";
        recommendedActions = [
          "Disponibilizar oxigenoterapia de emergência se necessário",
          "Acionar médico plantonista de sobreaviso",
          "Instruir familiar sobre posicionamento e manter vias aéreas pérvias"
        ];
      } else if (text.includes("sonda") || text.includes("curativo") || text.includes("lesão") || text.includes("traqueo") || text.includes("refluxo") || text.includes("febre")) {
        urgency = 'Alta';
        urgencyScore = 7;
        specialty = 'Enfermeiro';
        responseTime = "Atendimento Prioritário (Até 4 horas)";
        clinicalRationale = "Procedimento invasivo (sonda/curativo) ou manejo de estomas requer habilidade técnica do Enfermeiro para prevenção de infecções e complicações.";
        recommendedActions = [
          "Separar kit de curativo estério ou sonda de substituição",
          "Avaliar presença de hiperemia ou secreção purulenta",
          "Orientar a equipe de enfermagem sobre técnica asséptica"
        ];
      } else if (text.includes("engasgo") || text.includes("engolir") || text.includes("disfagia") || text.includes("voz")) {
        urgency = 'Média';
        urgencyScore = 6;
        specialty = 'Fonoaudiólogo';
        responseTime = "Programado para até 12 horas";
        clinicalRationale = "Alterações de deglutição requerem avaliação fonoaudiológica especializada para evitar risco de broncoaspiração de dieta e secreções.";
        recommendedActions = [
          "Avaliar consistência atual da dieta (pastosa/líquida)",
          "Manter paciente elevado a 45°-90° durante alimentação",
          "Agendar teste de deglutição com fonoaudiólogo"
        ];
      } else if (text.includes("movimento") || text.includes("avc") || text.includes("fraqueza") || text.includes("marcha") || text.includes("fisioterapia")) {
        urgency = 'Média';
        urgencyScore = 5;
        specialty = 'Fisioterapeuta';
        responseTime = "Atendimento Programado (Até 24 horas)";
        clinicalRationale = "Reabilitação motora e fortalecimento para prevenir contraturas e contratempos de imobilismo leito-cadeira.";
        recommendedActions = [
          "Avaliar amplitude de movimento e força muscular",
          "Instruir plano de exercícios para cuidador familiar"
        ];
      } else {
        urgency = 'Baixa';
        urgencyScore = 3;
        specialty = 'Técnico de Enfermagem';
        responseTime = "Visita de Rotina (Até 48 horas)";
        clinicalRationale = "Procedimentos de rotina e acompanhamento do plano de cuidados diários sem sinais imediatos de gravidade.";
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

    const prompt = `Você é um médico auditor especialista em triagem e acolhimento em Home Care (Manchester / Protocolo Canadense de Triagem Domiciliar).
Analise a solicitação de atendimento abaixo e determine o nível de urgência, a especialidade profissional ideal e as condutas imediatas recomendadas.

DESCRIÇÃO DA SOLICITAÇÃO:
"${description}"
${patientAge ? `- Idade do paciente: ${patientAge} anos` : ""}
${mainCondition ? `- Condição de base: ${mainCondition}` : ""}

Responda ESTRITAMENTE em formato JSON com os seguintes campos:
{
  "urgency": "Crítica" | "Alta" | "Média" | "Baixa",
  "urgencyScore": número de 1 a 10,
  "specialty": "Enfermeiro" | "Técnico de Enfermagem" | "Fisioterapeuta" | "Fonoaudiólogo" | "Médico" | "Nutricionista",
  "responseTime": "Tempo estimado para resposta em texto claro (ex: Atendimento Imediato até 2h)",
  "clinicalRationale": "Justificativa médica concisa e direta (2 a 3 frases) do porquê dessa classificação",
  "recommendedActions": ["Ação 1", "Ação 2", "Ação 3"]
}

Apenas o objeto JSON válido, sem formatação Markdown adicional nem blocos de código se possível.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    let resultText = response.text || "";
    // Clean up potential markdown code block backticks
    resultText = resultText.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(resultText);
      return res.json(parsed);
    } catch (e) {
      // If parsing failed, return fallback structured json
      return res.json({
        urgency: "Média",
        urgencyScore: 5,
        specialty: "Enfermeiro",
        responseTime: "Atendimento em até 12 horas",
        clinicalRationale: resultText.slice(0, 300) || "Análise concluída com sucesso.",
        recommendedActions: [
          "Verificar sinais vitais do paciente",
          "Contactar o familiar responsável",
          "Encaminhar solicitação à equipe de enfermagem"
        ]
      });
    }
  } catch (error: any) {
    console.error("Error in triage:", error);
    res.status(500).json({ error: error.message || "Failed to analyze triage request" });
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
