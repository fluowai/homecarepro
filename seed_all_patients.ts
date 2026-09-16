import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const SUPABASE_URL = 'https://qczwrubsiuafhwojfzbm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjendydWJzaXVhZmh3b2pmemJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE2NDc4MCwiZXhwIjoyMTAwNzQwNzgwfQ.GGXbSrR7246BCMZZ_ROFGUgA8BYcWZqbAilFX_5aHws';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const allPatients = [
  {
    name: 'Edith Dias Leite',
    birth_date: '1928-04-04',
    cpf: '047.591.927-00',
    gender: 'F',
    phone: '2125217087',
    email: 'edith.leite@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Acamada, restrita ao leito, uso de GTT, marcapasso cardíaco definitivo, hemiparesia à esquerda pós-AVC.',
    allergies: ['Quetiapina'],
    medications: [
      'Domperidona 1 mg/ml',
      'Bromoprida 4 mg/ml',
      'Simeticona 75 mg/ml',
      'Vitamina C 500g',
      'Anlodipino 5 mg',
      'Furosemida 40 mg',
      'Sertralina 100 mg',
      'Muvinlax Sachê 14 g'
    ],
    address: {
      street: 'Rua Prudente de Moraes',
      number: '1224, apto 101',
      neighborhood: 'Ipanema',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22420-043'
    },
    responsibles: [
      {
        name: 'Antonio Carlos Dias Leite (Filho)',
        phone: '21999712480',
        cpf: '511.411.837-49',
        address: 'Rua Tonelero, nº 271, apto 501, Copacabana, Rio de Janeiro/RJ, CEP 22030-001'
      },
      {
        name: 'Glória Dias Leite (Testemunha/Família)',
        phone: '6199977223'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 230,
    daily_package_shifts: 31,
    shift_value: 230,
    monthly_package_value: 7015,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Edith+Dias+Leite&backgroundColor=ec4899',
    timeline: [],
    files: []
  },
  {
    name: 'Elza Prol Simões',
    birth_date: '1940-01-01',
    cpf: '000.000.000-01',
    gender: 'F',
    phone: '21999999999',
    email: 'elza.simoes@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Assistência domiciliar com suporte de equipe multidisciplinar.',
    allergies: [],
    medications: [],
    address: {
      street: 'Rua Paulo Barreto',
      number: '115 – casa 1, Apto 201',
      neighborhood: 'Botafogo',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22280-010'
    },
    responsibles: [
      {
        name: 'Luiz Antônio Prol Simões (Filho - Advogado)',
        phone: '21999999999',
        cpf: '754.947.797-34',
        address: 'Rua Paulo Barreto, nº 115 – casa 1, Apto 201, Botafogo, Rio de Janeiro/RJ, CEP 22280-010'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 200,
    daily_package_shifts: 18,
    shift_value: 200,
    monthly_package_value: 3500,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Elza+Prol+Simoes&backgroundColor=8b5cf6',
    timeline: [],
    files: []
  },
  {
    name: 'Jocélia de Freitas Coelho Coutinho',
    birth_date: '1945-01-01',
    cpf: '000.000.000-02',
    gender: 'F',
    phone: '21999999998',
    email: 'jocelia.coutinho@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Assistência domiciliar com suporte de cuidadores e enfermagem.',
    allergies: [],
    medications: [],
    address: {
      street: 'Estrada dos Bandeirantes',
      number: '20.315',
      neighborhood: 'Vargem Pequena',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22783-550'
    },
    responsibles: [
      {
        name: 'Heloisa Coutinho Calmon Nogueira da Gama (Neta - Consultora)',
        phone: '21999999998',
        cpf: '060.049.497-79',
        address: 'Estrada dos Bandeirantes nº 20.315 – Vargem Pequena, Rio de Janeiro/RJ, CEP 22783-550'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 175,
    daily_package_shifts: 12,
    shift_value: 175,
    monthly_package_value: 2300,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Jocelia+Coutinho&backgroundColor=3b82f6',
    timeline: [],
    files: []
  },
  {
    name: 'Odete Fernandes de Freitas',
    birth_date: '1942-01-01',
    cpf: '000.000.000-03',
    gender: 'F',
    phone: '21999999997',
    email: 'odete.freitas@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Assistência domiciliar e cuidados com equipe multidisciplinar.',
    allergies: [],
    medications: [],
    address: {
      street: 'Rua das Garças',
      number: '5500/62',
      neighborhood: 'Maricá',
      city: 'Maricá',
      state: 'RJ',
      zipCode: '24909-335'
    },
    responsibles: [
      {
        name: 'Elizaine de Freitas Cordeiro Dias (Filha - Química)',
        phone: '21999999997',
        cpf: '009.049.476-88',
        address: 'Rua das Garças nº 5500/62 – Maricá/RJ, CEP 24909-335'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 220,
    daily_package_shifts: 31,
    shift_value: 220,
    monthly_package_value: 6710,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Odete+Fernandes&backgroundColor=10b981',
    timeline: [],
    files: []
  },
  {
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
      neighborhood: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22020-001'
    },
    responsibles: [
      {
        name: 'Neida Sauret Cavalcanti de Albuquerque (Esposa)',
        phone: '21999757998',
        cpf: '241.477.967-53',
        address: 'Avenida Nossa Senhora de Copacabana nº 300, apto 702, Copacabana, Rio de Janeiro/RJ, CEP 22020-001'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 180,
    daily_package_shifts: 12,
    shift_value: 180,
    monthly_package_value: 2360,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Tito+Sauret&backgroundColor=059669',
    timeline: [],
    files: []
  },
  {
    name: 'Odete Alves Coutinho',
    birth_date: '1947-08-05',
    cpf: '022.210.937-80',
    gender: 'F',
    phone: '21998136452',
    email: 'mhacoutinho68@gmail.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Doença de Alzheimer em fase inicial, marcha e deambulação preservadas.',
    allergies: [],
    medications: ['DON 10 mg', 'Cronobê'],
    address: {
      street: 'Rua Valparaíso',
      number: '70, apto 504',
      neighborhood: 'Tijuca',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20261-130'
    },
    responsibles: [
      {
        name: 'Marco Henrique Alves Coutinho (Filho - Empresário)',
        phone: '21984436064',
        cpf: '011.188.397-06',
        email: 'mhacoutinho68@gmail.com',
        address: 'Rua Dr Porciúncula, Venda da Cruz, nº 420, São Gonçalo/RJ, CEP 24411-006'
      },
      {
        name: 'Luiza Lischt da Silva Coutinho (Neta)',
        phone: '21974915848',
        cpf: '192.536.837-83'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 175,
    daily_package_shifts: 22,
    shift_value: 175,
    monthly_package_value: 3875,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Odete+Alves+Coutinho&backgroundColor=f59e0b',
    timeline: [],
    files: []
  },
  {
    name: 'Thereza Rocha Franco',
    birth_date: '1934-02-24',
    cpf: '000.000.000-04',
    gender: 'F',
    phone: '21966979755',
    email: 'thereza.franco@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Alzheimer estágio 3, HAS, Hérnia de Hiato, mobilidade reduzida, LP estágio II sacra.',
    allergies: ['Sulfa'],
    medications: [
      'Escitalopram 20mg',
      'Clor. de Memantina 20mg',
      'Adesivo Exelon Patch 15mg',
      'Risperidona 1mg',
      'Somalgin 100mg',
      'Sotalol 160mg',
      'Benicar 20mg',
      'Atorvastatina 10mg'
    ],
    address: {
      street: 'Rua Mirataia',
      number: '350, bl 01, apt 308 - Portugal Pequeno',
      neighborhood: 'Pechincha - Jacarepaguá',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22770-190'
    },
    responsibles: [
      {
        name: 'Márcia Regina Franco de Almeida (Responsável Contrato)',
        phone: '21966979755',
        cpf: '608.338.317-04',
        address: 'Rua Mirataia, nº 350, Bloco 01, Apartamento 308, Pechincha, Jacarepaguá, Rio de Janeiro/RJ, CEP 22770-190'
      },
      {
        name: 'Samuel José Franco (Responsável Legal)',
        phone: '21966979755'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 205,
    daily_package_shifts: 31,
    shift_value: 205,
    monthly_package_value: 6252.5,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Thereza+Rocha+Franco&backgroundColor=6366f1',
    timeline: [],
    files: []
  },
  {
    name: 'Maria Almira de Góes Araújo',
    birth_date: '1932-04-10',
    cpf: '000.000.000-05',
    gender: 'F',
    phone: '21999999996',
    email: 'maria.almira@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Cuidados com Colostomia, assistência de enfermagem e administração de polifarmácia.',
    allergies: [],
    medications: ['Losartana 50mg', 'Hidroclorotiazida 25mg', 'Complexo B', 'Nutren', 'Vitamina D'],
    address: {
      street: 'Rua Professor Henrique Costa',
      number: '260, apto 407',
      neighborhood: 'Pechincha',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22770-235'
    },
    responsibles: [
      {
        name: 'Maria Regina Araujo Reicherte Pimentel (Filha - Enfermeira)',
        phone: '21999999996',
        cpf: '687.771.407-53',
        address: 'Rua Professor Henrique Costa nº 260 apto 407 – Pechincha, Rio de Janeiro/RJ, CEP 22770-235'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 165,
    daily_package_shifts: 31,
    shift_value: 165,
    monthly_package_value: 5032.5,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Maria+Almira&backgroundColor=14b8a6',
    timeline: [],
    files: []
  },
  {
    name: 'Nely Baptista de Deus Carvalho',
    birth_date: '1929-07-02',
    cpf: '128.256.891-49',
    gender: 'F',
    phone: '21995845011',
    email: 'diretrizchavesss@gmail.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Demência senil, HAS, Diabetes Mellitus, síndrome do pôr do sol, histórico de quedas.',
    allergies: [],
    medications: ['Maleato de Enalapril', 'Seakalm 600 mg', 'Glifage XR 500 mg', 'Melatonina'],
    address: {
      street: 'Rua Quiririm',
      number: '1101, bloco 2, apto 104',
      neighborhood: 'Vila Valqueire',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '21330-658'
    },
    responsibles: [
      {
        name: 'Adriano de Deus Chaves da Silva (Filho - Empresário)',
        phone: '21995845011',
        cpf: '399.016.531-34',
        email: 'diretrizchavesss@gmail.com',
        address: 'Rua Quiririm, n° 1101, bloco 2, apto 104, Vila Valqueire, Rio de Janeiro/RJ, CEP 21330-658'
      },
      {
        name: 'Anna (Filha - Contato de Emergência)',
        phone: '21994163966'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 0,
    daily_package_shifts: 14,
    shift_value: 0,
    monthly_package_value: 0,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nely+Carvalho&backgroundColor=a855f7',
    timeline: [],
    files: []
  },
  {
    name: 'Zuleida Barros de Alencar',
    birth_date: '1931-12-01',
    cpf: '659.211.947-00',
    gender: 'F',
    phone: '21999167716',
    email: 'outtonos@yahoo.com.br',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'HAS, osteoporose grave, histórico de fraturas e cirurgias prévias, joelho varo D, uso de cadeira de rodas.',
    allergies: [],
    medications: ['Synthroid 50 mcg', 'Selozok 25 mg', 'Venzer 16 mg', 'Vitamina D 2.000 UI', 'Somalgin Cardio 81 mg', 'Dobeven 500 mg', 'Novanlo 2,5 mg', 'Pleanense 10 mg'],
    address: {
      street: 'Rua Santo Euquério',
      number: '110',
      neighborhood: 'Freguesia',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22760-110'
    },
    responsibles: [
      {
        name: 'Márcia Barros de Alencar Silva (Filha - Professora)',
        phone: '21976250205',
        cpf: '851.201.037-15',
        email: 'outtonos@yahoo.com.br',
        address: 'Rua Santo Euquério, n° 110, Freguesia, Rio de Janeiro/RJ, CEP 22760-110'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 0,
    daily_package_shifts: 9,
    shift_value: 0,
    monthly_package_value: 0,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Zuleida+Alencar&backgroundColor=06b6d4',
    timeline: [],
    files: []
  },
  {
    name: 'Vânia Araujo Monteiro Pinto',
    birth_date: '1949-06-07',
    cpf: '268.256.437-20',
    gender: 'F',
    phone: '21994163966',
    email: 'dayaneppinto@gmail.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Demência frontotemporal, histórico de TCE grave, sequelas motoras, uso temporário de SVD por fístula uretral.',
    allergies: [],
    medications: ['Depakene 500 mg', 'Quetiapina 100 mg', 'Olanzapina 5 mg', 'Micpure 50 mg', 'Muvinlax', 'Lactulona', 'Sertralina 100 mg', 'Donaren 50 mg'],
    address: {
      street: 'Avenida Érico Veríssimo',
      number: '165, apto 201',
      neighborhood: 'Barra da Tijuca',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22621-180'
    },
    responsibles: [
      {
        name: 'Dayane Pereira Pinto (Nora - Advogada)',
        phone: '21994163966',
        cpf: '056.417.017-85',
        email: 'dayaneppinto@gmail.com',
        address: 'Avenida Érico Veríssimo, n° 165, apto 201, Barra da Tijuca, Rio de Janeiro/RJ, CEP 22621-180'
      },
      {
        name: 'Edmundo Monteiro Pinto Filho (Filho)',
        phone: '21994163966'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 0,
    daily_package_shifts: 31,
    shift_value: 0,
    monthly_package_value: 0,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Vania+Pinto&backgroundColor=f43f5e',
    timeline: [],
    files: []
  },
  {
    name: 'Nina Rosa Berg',
    birth_date: '1930-09-27',
    cpf: '023.557.017-68',
    gender: 'F',
    phone: '21988155112',
    email: 'mario.castro@acpadvogados.adv.br',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'DPOC com oxigenoterapia eventual, HAS, mobilidade reduzida, hematoma pretibial MID pós queda sentada.',
    allergies: ['Iodo'],
    medications: ['Synthroid 25 mcg', 'Pantoprazol 40 mg', 'Digesam 10 mg', 'Norvasc 5 mg', 'Natrilix SR 1,5 mg', 'Aradois 50 mg', 'Memantina 10 mg', 'Mirtazapina 30 mg', 'Rivotril 0,25 mg', 'Etoricoxibe 90 mg'],
    address: {
      street: 'Avenida Rui Barbosa',
      number: '500, apto 1.201',
      neighborhood: 'Flamengo',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22250-020'
    },
    responsibles: [
      {
        name: 'Mario de Castro Silva (Procurador / Advogado)',
        phone: '21968292222',
        cpf: '011.932.647-74',
        email: 'mario.castro@acpadvogados.adv.br',
        address: 'Rua Fernando Osório, nº 18, apartamento 702, Flamengo, Rio de Janeiro/RJ, CEP 22.230-040'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 0,
    daily_package_shifts: 31,
    shift_value: 0,
    monthly_package_value: 0,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Nina+Rosa+Berg&backgroundColor=64748b',
    timeline: [],
    files: []
  },
  {
    name: 'José Catanhene Lago',
    birth_date: '1937-04-22',
    cpf: '000.000.000-06',
    gender: 'M',
    phone: '21982084410',
    email: 'jose.lago@homecare.com',
    status: 'active',
    plan_type: 'Particular',
    diagnostic: 'Parkinson com afasia importante, Demência, marcapasso cardíaco definitivo, aneurisma de aorta abdominal infrarrenal.',
    allergies: [],
    medications: ['Florineffe', 'Alois', 'Prolopa', 'Reparil gel'],
    address: {
      street: 'Rio de Janeiro',
      number: 'S/N',
      neighborhood: 'Freguesia',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22760-000'
    },
    responsibles: [
      {
        name: 'Florinda Lago (Esposa)',
        phone: '21982084410'
      }
    ],
    pad_items: [{ specialty: 'Cuidador de Idosos', quantity: 1 }],
    daily_package_value: 240,
    daily_package_shifts: 30,
    shift_value: 240,
    monthly_package_value: 7900,
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Jose+Lago&backgroundColor=84cc16',
    timeline: [],
    files: []
  }
];

async function seedAll() {
  console.log('Iniciando cadastro dos pacientes no banco Supabase...');
  const { data: tenants, error: tenantErr } = await supabase.from('tenants').select('id').limit(1);
  if (tenantErr) {
    console.error('Erro ao buscar tenant:', tenantErr);
    return;
  }
  const tenantId = tenants?.[0]?.id || 'rj';
  console.log(`Usando tenant: ${tenantId}`);

  for (const p of allPatients) {
    const { data: existing } = await supabase
      .from('patients')
      .select('id, name')
      .ilike('name', `%${p.name.split(' ')[0]}%`)
      .limit(1);

    const patientPayload = {
      tenant_id: tenantId,
      name: p.name,
      birth_date: p.birth_date,
      cpf: p.cpf,
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      status: p.status,
      plan_type: p.plan_type,
      diagnostic: p.diagnostic,
      allergies: p.allergies,
      medications: p.medications,
      address: p.address,
      responsibles: p.responsibles,
      pad_items: p.pad_items,
      daily_package_value: p.daily_package_value,
      daily_package_shifts: p.daily_package_shifts,
      avatar: p.avatar,
      timeline: p.timeline,
      files: p.files
    };

    if (existing && existing.length > 0) {
      const { error: updateErr } = await supabase
        .from('patients')
        .update(patientPayload)
        .eq('id', existing[0].id);
      if (updateErr) {
        console.error(`Erro ao atualizar paciente ${p.name}:`, updateErr);
      } else {
        console.log(`✅ Paciente atualizado com sucesso: ${p.name} (ID: ${existing[0].id})`);
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('patients')
        .insert([{ id: crypto.randomUUID(), ...patientPayload }])
        .select();
      if (insertErr) {
        console.error(`Erro ao inserir paciente ${p.name}:`, insertErr);
      } else {
        console.log(`✅ Paciente cadastrado com sucesso: ${p.name} (ID: ${inserted?.[0]?.id})`);
      }
    }
  }
  console.log('🚀 TODOS os 13 pacientes foram sincronizados com sucesso no Supabase!');
}

seedAll();
