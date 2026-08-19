import { createClient } from '@supabase/supabase-js';
import * as xlsx from 'xlsx';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TENANT_ID = 'tenant-scsaude-1787061511657'; // From the creation step

async function parseScaleWithAI(name: string, colC: string, colD: string, scaleText: string) {
  const prompt = `Você é um analista de dados médicos. 
Extraia as informações estruturadas sobre o paciente/cliente e o contrato da seguinte linha preenchida manualmente em uma planilha de Home Care:

Nome: ${name}
Valor Coluna 1: ${colC}
Valor Coluna 2: ${colD}
Texto da Escala: ${scaleText}

Interprete:
1. Qual a frequência/escala (ex: 24h todo dia, 12h, dias específicos da semana).
2. Tente inferir se os valores representam valor mensal ou valor do plantão.
3. Crie um resumo limpo (ex: "Escala 24h, 30 dias/mês. Valores anotados: 190, 255").

Responda SOMENTE em JSON estruturado assim:
{
  "frequencia_resumo": "...",
  "valor_interpretado": "..."
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    let text = response.text || "{}";
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(text);
  } catch (err) {
    console.error(`Error parsing AI for ${name}:`, err);
    return { frequencia_resumo: scaleText, valor_interpretado: `${colC} / ${colD}` };
  }
}

async function run() {
  const file = 'planilha_sc.xlsx';
  try {
    const buffer = fs.readFileSync(file);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    const clientesSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'CLIENTES');
    if (!clientesSheetName) {
      console.error('Aba CLIENTES não encontrada!');
      return;
    }
    
    const sheet = workbook.Sheets[clientesSheetName];
    // Convert to 2D array
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log(`Processando ${data.length} linhas da aba CLIENTES...`);
    
    // Skip empty and assume first rows might be headers or empty, we check if column B has a name
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const name = row[1]; // Col B
      if (!name || typeof name !== 'string' || name.length < 3 || name === 'NOME') continue;
      
      const colC = row[2] ? String(row[2]) : '';
      const colD = row[3] ? String(row[3]) : '';
      const scale = row[4] ? String(row[4]) : '';
      const date = row[5] ? String(row[5]) : '';
      
      console.log(`[${i}] Processando paciente: ${name}...`);
      
      // Parse with AI
      const aiParsed = await parseScaleWithAI(name, colC, colD, scale);
      
      // Create Patient in Supabase
      const patientId = `patient-${crypto.randomBytes(4).toString('hex')}`;
      
      const { error: pErr } = await supabase.from('patients').insert({
        id: patientId,
        tenant_id: TENANT_ID,
        name: name,
        status: 'active',
        plan_type: 'Particular',
        diagnostic: aiParsed.frequencia_resumo, // Storing the scale info in diagnostic for now as notes
        timeline: [{ date: new Date().toISOString().split('T')[0], title: 'Importação', description: `Valores originais: ${colC} / ${colD} | Data plan: ${date} | IA: ${aiParsed.valor_interpretado}` }]
      });
      
      if (pErr) {
        console.error(`Erro ao inserir ${name}:`, pErr);
      } else {
        console.log(`✅ ${name} inserido com sucesso!`);
      }
      
      // Sleep slightly to respect AI rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('Importação da aba CLIENTES concluída!');
    
  } catch (error) {
    console.error('Erro na importação:', error);
    console.log('Certifique-se de que o arquivo planilha_sc.xlsx existe na raiz do projeto.');
  }
}

run();
