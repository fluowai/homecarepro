import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = 'https://qczwrubsiuafhwojfzbm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjendydWJzaXVhZmh3b2pmemJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE2NDc4MCwiZXhwIjoyMTAwNzQwNzgwfQ.GGXbSrR7246BCMZZ_ROFGUgA8BYcWZqbAilFX_5aHws';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
  const tenantId = tenants?.[0]?.id || 'rj';

  const tito = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    name: 'Tito Sauret Cavalcanti de Albuquerque',
    birth_date: '1935-07-14',
    cpf: '196.996.207-06',
    gender: 'M',
    phone: '21999757998', 
    email: 'neidasauret@gmail.com', 
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Doença de Parkinson e Hipertensão Arterial Sistêmica.',
    allergies: ['Látex'],
    medications: [
      'Pantoprazol 40 mg',
      'Prolopa 200/50 mg',
      'Ômega',
      'NAC',
      'Mantidan 100 mg',
      'Succinato de Metoprolol 50 mg',
      'Melatonina 3 mg'
    ],
    address: {
      street: 'Avenida Nossa Senhora de Copacabana',
      number: '300, apto 702',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22020-001'
    },
    responsibles: [
      { name: 'Neida Sauret Cavalcanti (esposa)', phone: '21999757998' },
      { name: 'Tito Sauret Filho', phone: '51996918195' }
    ],
    pad_items: [
      { specialty: 'Cuidador de Idosos', quantity: 1 } 
    ],
    anamnesis: {
      conditions: {
        parkinson: true,
        hypertension: true,
        osteoporosis: true
      },
      mobility: {
        needsHelp: true,
        usesObjects: ['Andador', 'Cadeira de rodas']
      },
      careNeeds: {
        bathHelp: true,
        bathLocation: 'Chuveiro e Cadeira higiênica',
        diaper: true,
        constipation: true
      },
      history: {
        falls: true,
        recentFalls: 'Há duas semanas'
      },
      medicalHistory: 'Paciente masculino, 90 anos, com diagnóstico de Doença de Parkinson e Hipertensão Arterial Sistêmica. Em uso de terapia dopaminérgica e anti-hipertensiva. Evolui com episódios de tontura sugestivos de hipotensão ortostática... Histórico de infecção urinária associada à baixa ingestão hídrica.',
      physicalExam: 'Paciente encontra-se lúcido, orientado, em regular estado geral, colaborativo. Mantém-se grande parte do tempo sentado, com mobilidade reduzida e deambulação instável. Lesões cutâneas hiperpigmentadas em áreas fotoexpostas (face/MMSS). Edema importante bilateral (+++/+++) em MMII, com lesões nos pododáctilos.',
      nursingDiagnostics: [
        'Mobilidade física prejudicada relacionado a distúrbio neuromuscular',
        'Risco de quedas relacionado a instabilidade postural e tontura',
        'Déficit no autocuidado: banho/higiene e uso do toalete',
        'Constipação relacionada a baixa ingestão hídrica e mobilidade reduzida',
        'Integridade da pele prejudicada (lesões em pododáctilos e cutâneas)',
        'Perfusão tissular periférica ineficaz (edema importante)',
        'Risco de infecção urinária',
        'Síndrome da fragilidade do idoso'
      ],
      expectedResults: [
        'Controle de quedas e aumento da segurança domiciliar',
        'Melhora da deambulação com assistência',
        'Manutenção ou ganho de independência funcional parcial',
        'Padrão intestinal regular',
        'Ausência de novas lesões na pele',
        'Redução de edema em MMII',
        'Ingesta hídrica adequada',
        'Ausência de infecção urinária',
        'Estabilização clínica do idoso frágil'
      ],
      nursingInterventions: [
        'Orientar prevenção de quedas e adequação do ambiente',
        'Monitorização da pressão arterial e avaliação de hipotensão ortostática',
        'Apoiar higiene pessoal preservando a autonomia',
        'Estimular hábito intestinal e controle de constipação',
        'Promoção e fracionamento de hidratação diária',
        'Avaliar integridade cutânea diariamente',
        'Promover higiene íntima e estimular micção',
        'Educação em saúde para a esposa sobre riscos',
        'Terapia de exercícios e estímulo à deambulação assistida'
      ]
    },
    daily_package_value: 0,
    daily_package_shifts: 12,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Tito+Sauret&backgroundColor=059669',
    timeline: [],
    files: []
  };

  const { data, error } = await supabase.from('patients').insert([tito]).select();
  if (error) {
    console.error('Error inserting patient:', error);
  } else {
    console.log('Successfully inserted patient Tito:', data);
  }
}

run();
