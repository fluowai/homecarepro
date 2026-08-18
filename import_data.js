import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TENANT_ID = 'tenant-1787056129090';

// Function to parse a basic CSV
function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const data = [];
  let headers = [];
  let foundHeaders = false;

  for (const line of lines) {
    if (line.startsWith('QTDE,FILIAL,TÉCNICO,COREN')) {
      headers = line.split(',');
      foundHeaders = true;
      continue;
    }
    if (!foundHeaders || line.startsWith(',,,')) continue;
    
    // Split by comma, naive approach but works for this file which has no quoted commas
    const parts = line.split(',');
    if (parts.length < headers.length) continue;
    
    const row = {};
    headers.forEach((h, i) => {
      row[h.trim()] = parts[i].trim();
    });
    data.push(row);
  }
  return data;
}

async function run() {
  const filePath = 'C:\\Users\\paulo\\.gemini\\antigravity\\brain\\31d83844-07fe-49a7-8e71-39bfbefe4c04\\.system_generated\\steps\\84\\content.md';
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const rawData = parseCSV(csvContent);

  const patientsMap = new Map(); // name -> { ... }

  for (const row of rawData) {
    let name = row['TÉCNICO'];
    if (!name) continue;

    let coren = row['COREN'];
    let cpf = row['CPF'];
    let pix = row['PIX'];
    let phone = row['TELEFONE'];
    let email = row['E-MAIL'];
    let pacienteStr = row['PACIENTE'];
    let cidade = row['CIDADE'];
    
    // 1. Data Cleaning
    let status = 'active';
    let specialty = 'Técnico de Enfermagem';

    if (coren === 'CUIDADORA' || coren === 'CUIDADOR') {
      specialty = 'Cuidador';
      coren = '';
    } else if (coren === 'AGUARDANDO COREN') {
      coren = 'Aguardando';
    }

    const lowerEmail = email.toLowerCase();
    const lowerPhone = phone.toLowerCase();

    if (lowerEmail.includes('saiu da escala') || lowerPhone.includes('saiu da escala')) {
      status = 'inactive';
      if (lowerEmail.includes('saiu')) email = '';
      if (lowerPhone.includes('saiu')) phone = '';
    }
    if (lowerEmail.includes('férias') || lowerPhone.includes('férias')) {
      status = 'offline'; // Busy or offline
      if (lowerEmail.includes('férias')) email = '';
      if (lowerPhone.includes('férias')) phone = '';
    }
    if (lowerEmail.includes('nova') || lowerPhone.includes('nova') || lowerEmail.includes('novo') || lowerPhone.includes('novo')) {
      if (lowerEmail.includes('nova') || lowerEmail.includes('novo')) email = '';
      if (lowerPhone.includes('nova') || lowerPhone.includes('novo')) phone = '';
    }
    if (email === 'AGUARDANDO COREN') email = '';

    // Fix CPF format if needed or leave as is
    cpf = cpf.replace(/[^0-9.-]/g, '');

    // Insert Professional
    const profId = `prof-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const professional = {
      id: profId,
      tenant_id: TENANT_ID,
      name: name,
      cpf: cpf,
      specialty: specialty,
      registration: coren,
      status: status,
      email: email,
      phone: phone,
      address: { city: cidade },
      documents: [{ type: 'PIX', value: pix }]
    };

    console.log(`Inserting Professional: ${name}`);
    const { error: profError } = await supabase.from('professionals').insert([professional]);
    if (profError) {
      console.error(`Error inserting professional ${name}:`, profError);
    }

    // Process Patients
    if (pacienteStr) {
      // Split by "/"
      const pNames = pacienteStr.split('/').map(n => n.trim()).filter(n => n);
      for (const pName of pNames) {
        if (!patientsMap.has(pName)) {
          patientsMap.set(pName, {
            id: `pat-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            tenant_id: TENANT_ID,
            name: pName,
            address: { city: cidade }
          });
        }
      }
    }
  }

  console.log(`\nFound ${patientsMap.size} unique patients. Inserting...`);
  for (const [pName, patientData] of patientsMap.entries()) {
    console.log(`Inserting Patient: ${pName}`);
    const { error: patError } = await supabase.from('patients').insert([patientData]);
    if (patError) {
      console.error(`Error inserting patient ${pName}:`, patError);
    }
  }

  console.log('\nMigration complete!');
}

run().catch(console.error);
