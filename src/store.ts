import { create } from 'zustand';
import { 
  Patient, 
  Professional, 
  Visit, 
  CRMLead, 
  Message, 
  Tenant, 
  VisitStatus,
  Medicine,
  SurveyResponse,
  SurveyConfig,
  AlertConfig,
  ClinicalAlert,
  OfflineSyncItem
} from './types';

interface HomeCareState {
  tenants: Tenant[];
  activeTenantId: string;
  patients: Patient[];
  professionals: Professional[];
  visits: Visit[];
  leads: CRMLead[];
  messages: Message[];
  medicines: Medicine[];
  surveys: SurveyResponse[];
  surveyConfig: SurveyConfig;
  alertConfig: AlertConfig;
  isOffline: boolean;
  offlineSyncQueue: OfflineSyncItem[];
  offlineLogs: string[];
  
  // Actions
  setActiveTenant: (id: string) => void;
  
  // Offline/Sync Actions
  setOfflineMode: (offline: boolean) => void;
  syncOfflineData: () => Promise<void>;
  clearOfflineQueue: () => void;
  
  // Patient Actions
  addPatient: (patient: Omit<Patient, 'id' | 'tenantId'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addPatientFile: (patientId: string, name: string, size: string, type: string) => void;
  addTimelineEvent: (patientId: string, event: { title: string; description: string; type: 'clinical' | 'visit' | 'system' | 'billing'; author: string }) => void;
  
  // Professional Actions
  addProfessional: (professional: Omit<Professional, 'id' | 'tenantId'>) => void;
  updateProfessional: (id: string, professional: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;
  
  // Visit Actions
  addVisit: (visit: Omit<Visit, 'id' | 'tenantId'>) => void;
  updateVisit: (id: string, visit: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  checkInVisit: (id: string, location: string) => void;
  checkOutVisit: (id: string, location: string, report: string, vitals?: { pa: string; fc: string; temp: string; sat: string }, rawNotes?: string, usedMeds?: { id: string; name: string; qty: number }[]) => void;
  
  // CRM Actions
  addLead: (lead: Omit<CRMLead, 'id' | 'tenantId' | 'createdAt'>) => void;
  updateLead: (id: string, lead: Partial<CRMLead>) => void;
  deleteLead: (id: string) => void;
  
  // Message Actions
  sendMessage: (patientId: string, text: string, sender: 'operator' | 'system') => void;
  receiveMessage: (patientId: string, text: string) => void;
  markMessagesRead: (patientId: string) => void;

  // Medicine Actions
  addMedicine: (medicine: Omit<Medicine, 'id' | 'tenantId'>) => void;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  consumeMedicine: (id: string, qty: number) => boolean;

  // Survey Actions
  updateSurveyConfig: (config: Partial<SurveyConfig>) => void;
  addSurveyResponse: (survey: Omit<SurveyResponse, 'id' | 'tenantId'>) => void;
  respondToSurvey: (id: string, rating: number, comment: string) => void;

  // Alert Actions
  updateAlertConfig: (config: Partial<AlertConfig>) => void;
  getCalculatedAlerts: () => ClinicalAlert[];

  // AI Helpers (Fetch from local server API)
  generateAiSummary: (patientId: string) => Promise<string>;
  generateVisitReportAi: (visitId: string, rawNotes: string, vitals: { pa: string; fc: string; temp: string; sat: string }) => Promise<string>;
  suggestScheduleAi: () => Promise<string>;
}

// Helpers for dates relative to "today"
const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const INITIAL_TENANTS: Tenant[] = [
  { id: 'sp', name: 'HomeCare Pro São Paulo', logo: '🏥', cnpj: '12.345.678/0001-99', plan: 'Enterprise' },
  { id: 'rj', name: 'Anjos do Lar Rio de Janeiro', logo: '👼', cnpj: '98.765.432/0001-11', plan: 'Pro' }
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1',
    tenantId: 'sp',
    name: 'Dona Francisca Ribeiro Silva',
    birthDate: '1948-04-12',
    cpf: '123.456.789-00',
    phone: '(11) 98111-2233',
    email: 'francisca.silva@demo.com',
    status: 'active',
    planType: 'Bradesco Saúde',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Alzheimer Estágio Moderado, Hipertensão Arterial e Osteoporose.',
    allergies: ['Penicilina', 'Iodo'],
    medications: ['Aricept (Donepezila) 10mg - 1x ao dia (noite)', 'Losartana 50mg - 2x ao dia', 'Melatonina 3mg - 1x ao dia'],
    files: [
      { id: 'file-1', name: 'Laudo_Neurologia_DrAlvaro.pdf', size: '1.2 MB', uploadedAt: getRelativeDate(-10), type: 'application/pdf' },
      { id: 'file-2', name: 'Exame_Sangue_Junho2026.pdf', size: '840 KB', uploadedAt: getRelativeDate(-4), type: 'application/pdf' }
    ],
    timeline: [
      { id: 't-1', date: getRelativeDate(-15), title: 'Admissão no Homecare', description: 'Paciente integrada ao programa de reabilitação domiciliar pela equipe multidisciplinar.', type: 'system', author: 'Supervisão SP' },
      { id: 't-2', date: getRelativeDate(-12), title: 'Consulta Médica de Admissão', description: 'Dr. Roberto prescreveu plano terapêutico inicial e medicação neurológica.', type: 'clinical', author: 'Dr. Roberto Almeida' },
      { id: 't-3', date: getRelativeDate(-3), title: 'Sessão de Fisioterapia Concluída', description: 'Treino de marcha com andador, excelente tolerância e equilíbrio estável.', type: 'visit', author: 'Carlos Santos' },
      { id: 't-4', date: getRelativeDate(-1), title: 'Entrega de Insumos', description: 'Fraldas geriátricas e soro fisiológico entregues na residência.', type: 'billing', author: 'Logística Pro' }
    ],
    address: {
      street: 'Rua das Palmeiras',
      number: '425',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01226-010'
    },
    summaryAi: "Paciente de 78 anos de idade, sob regime de atendimento domiciliar devido a quadro demencial por Doença de Alzheimer e comorbidades vasculares. Apresenta risco moderado de queda devido à osteoporose e marcha claudicante. Alérgica a Penicilina. Em uso regular de Donepezila e Losartana. Recomendada supervisão constante de enfermagem de 12 horas e sessões de fisioterapia motora para manutenção de tônus."
  },
  {
    id: 'pat-2',
    tenantId: 'sp',
    name: 'Seu Geraldo de Souza',
    birthDate: '1942-09-28',
    cpf: '234.567.890-11',
    phone: '(11) 97222-3344',
    email: 'geraldo.souza@demo.com',
    status: 'active',
    planType: 'Particular',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Pós-Operatório recente de Artroplastia Total de Quadril Direito (D+12), Diabetes Mellitus Tipo 2.',
    allergies: ['Dipirona'],
    medications: ['Metformina 850mg - 2x ao dia', 'Clexane 40mg SC - 1x ao dia (anticoagulante)', 'Tramal 50mg - se dor forte'],
    files: [
      { id: 'file-3', name: 'Alta_Hospitalar_SirioLibanes.pdf', size: '2.1 MB', uploadedAt: getRelativeDate(-12), type: 'application/pdf' },
      { id: 'file-4', name: 'RaioX_Bacia_PosOperatorio.jpg', size: '1.4 MB', uploadedAt: getRelativeDate(-11), type: 'image/jpeg' }
    ],
    timeline: [
      { id: 't-5', date: getRelativeDate(-12), title: 'Alta Hospitalar & Início do Home Care', description: 'Início imediato das sessões de fisioterapia diárias para reabilitação ortopédica.', type: 'system', author: 'Supervisão SP' },
      { id: 't-6', date: getRelativeDate(-8), title: 'Retirada de Pontos Cirúrgicos', description: 'Incisão cirúrgica de bacia com excelente cicatrização, sem sinais de infecção ou secreção.', type: 'clinical', author: 'Dra. Mariana Costa' },
      { id: 't-7', date: getRelativeDate(-2), title: 'Treino de Carga Parcial', description: 'Evolução favorável. Iniciada transferência ativa da cama para poltrona com andador.', type: 'visit', author: 'Carlos Santos' }
    ],
    address: {
      street: 'Avenida Brigadeiro Luís Antônio',
      number: '2300',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01318-002'
    },
    summaryAi: "Paciente idoso de 84 anos com boa reserva cognitiva, focado no programa de reabilitação física pós-artroplastia de quadril. Alérgico a Dipirona. Diabetes controlado com hipoglicemiantes orais. Cuidados focados em profilaxia de trombose profunda (Clexane), vigilância de pele e reabilitação diária com fisioterapeuta."
  },
  {
    id: 'pat-3',
    tenantId: 'sp',
    name: 'Ana Júlia de Albuquerque',
    birthDate: '2016-06-15',
    cpf: '345.678.901-22',
    phone: '(11) 96333-4455',
    email: 'mae.anajulia@demo.com',
    status: 'active',
    planType: 'Unimed',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Paralisia Cerebral Espástica GMFCS V, Traqueostomizada e Gastrostomizada (GTT).',
    allergies: ['Látex', 'Sulfa'],
    medications: ['Baclofeno 10mg - 1/2 comprimido 3x ao dia', 'Fenobarbital 100mg - 1x ao dia (noite)', 'Gaviscon 5ml - após as refeições'],
    files: [
      { id: 'file-5', name: 'Relatorio_Neuropediatria_HC.pdf', size: '3.4 MB', uploadedAt: getRelativeDate(-20), type: 'application/pdf' }
    ],
    timeline: [
      { id: 't-8', date: getRelativeDate(-20), title: 'Instalação de Oxigênio Domiciliar', description: 'Concentrador de O2 e cilindro de backup testados e aprovados pela enfermagem.', type: 'system', author: 'Logística Pro' },
      { id: 't-9', date: getRelativeDate(-10), title: 'Troca de Cânula de Traqueostomia', description: 'Procedimento realizado com sucesso, boa expansibilidade torácica pós-procedimento.', type: 'clinical', author: 'Dr. Roberto Almeida' }
    ],
    address: {
      street: 'Rua Pamplona',
      number: '980',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01405-001'
    }
  },
  {
    id: 'pat-4',
    tenantId: 'rj',
    name: 'Seu Moacyr Guimarães',
    birthDate: '1939-11-05',
    cpf: '456.789.012-33',
    phone: '(21) 98222-7788',
    email: 'moacyr.guimaraes@demo.com',
    status: 'active',
    planType: 'Particular',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'DPOC Grave (Sequela de Tabagismo), Cardiopatia Isquêmica Crônica.',
    allergies: ['Nenhuma relatada'],
    medications: ['Spiriva Respimat - 2 puffs pela manhã', 'AAS 100mg - 1x ao dia', 'Carvedilol 6.25mg - 2x ao dia'],
    files: [],
    timeline: [
      { id: 't-10', date: getRelativeDate(-5), title: 'Admissão RJ', description: 'Início do suporte domiciliar respiratório na filial Rio de Janeiro.', type: 'system', author: 'Supervisão RJ' }
    ],
    address: {
      street: 'Avenida Atlântica',
      number: '1200',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22021-001'
    }
  }
];

const INITIAL_PROFESSIONALS: Professional[] = [
  {
    id: 'prof-1',
    tenantId: 'sp',
    name: 'Dra. Mariana Costa',
    specialty: 'Enfermeiro',
    registration: 'COREN-SP 432.109',
    status: 'active',
    email: 'mariana.costa@homecarepro.com',
    phone: '(11) 98765-4321',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120',
    rating: 4.9
  },
  {
    id: 'prof-2',
    tenantId: 'sp',
    name: 'Carlos Santos',
    specialty: 'Fisioterapeuta',
    registration: 'CREFITO-SP 98.765',
    status: 'active',
    email: 'carlos.fisioterapeuta@homecarepro.com',
    phone: '(11) 97654-3210',
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120',
    rating: 5.0
  },
  {
    id: 'prof-3',
    tenantId: 'sp',
    name: 'Thiago Silva',
    specialty: 'Técnico de Enfermagem',
    registration: 'COREN-TE 112.334',
    status: 'busy',
    email: 'thiago.tecnico@homecarepro.com',
    phone: '(11) 96543-2109',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120',
    rating: 4.7
  },
  {
    id: 'prof-4',
    tenantId: 'sp',
    name: 'Dr. Roberto Almeida',
    specialty: 'Médico',
    registration: 'CRM-SP 180.456',
    status: 'offline',
    email: 'roberto.almeida@homecarepro.com',
    phone: '(11) 95432-1098',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120',
    rating: 4.9
  },
  {
    id: 'prof-5',
    tenantId: 'rj',
    name: 'Dra. Eliane Pires',
    specialty: 'Enfermeiro',
    registration: 'COREN-RJ 220.180',
    status: 'active',
    email: 'eliane.pires@homecarepro.com',
    phone: '(21) 98777-6655',
    avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120',
    rating: 4.8
  }
];

const INITIAL_VISITS: Visit[] = [
  {
    id: 'v-1',
    tenantId: 'sp',
    patientId: 'pat-1',
    professionalId: 'prof-1',
    date: getRelativeDate(0), // Hoje
    timeStart: '08:00',
    timeEnd: '10:00',
    status: 'concluida',
    checkInTime: '07:58',
    checkOutTime: '10:05',
    checkInLocation: '-23.5615,-46.6812 (Sede Clínicas)',
    checkOutLocation: '-23.5617,-46.6815 (Sede Clínicas)',
    report: 'Visita de enfermagem realizada de rotina. Sinais vitais estáveis (PA 120/80 mmHg, FC 74 bpm). Curativo de úlcera sacral higienizado e trocado (uso de alginato de cálcio), demonstrando evolução de tecido de granulação. Paciente aceitou alimentação via oral sem episódios de broncoaspiração.',
    value: 150
  },
  {
    id: 'v-2',
    tenantId: 'sp',
    patientId: 'pat-2',
    professionalId: 'prof-2',
    date: getRelativeDate(0), // Hoje
    timeStart: '10:30',
    timeEnd: '11:30',
    status: 'em_andamento',
    checkInTime: '10:28',
    checkInLocation: '-23.5645,-46.6521 (Av Paulista)',
    value: 180
  },
  {
    id: 'v-3',
    tenantId: 'sp',
    patientId: 'pat-3',
    professionalId: 'prof-3',
    date: getRelativeDate(0), // Hoje
    timeStart: '14:00',
    timeEnd: '18:00',
    status: 'agendada',
    value: 220
  },
  {
    id: 'v-4',
    tenantId: 'sp',
    patientId: 'pat-1',
    professionalId: 'prof-2',
    date: getRelativeDate(1), // Amanhã
    timeStart: '09:00',
    timeEnd: '10:00',
    status: 'agendada',
    value: 180
  },
  {
    id: 'v-5',
    tenantId: 'sp',
    patientId: 'pat-2',
    professionalId: 'prof-1',
    date: getRelativeDate(1), // Amanhã
    timeStart: '14:00',
    timeEnd: '15:30',
    status: 'agendada',
    value: 150
  },
  {
    id: 'v-6',
    tenantId: 'rj',
    patientId: 'pat-4',
    professionalId: 'prof-5',
    date: getRelativeDate(0), // Hoje
    timeStart: '15:00',
    timeEnd: '16:30',
    status: 'agendada',
    value: 160
  }
];

const INITIAL_LEADS: CRMLead[] = [
  {
    id: 'lead-1',
    tenantId: 'sp',
    name: 'Amanda Oliveira (Pai: Sr. Luiz)',
    phone: '(11) 98888-7766',
    email: 'amanda@demo.com',
    status: 'lead',
    source: 'WhatsApp',
    estimatedValue: 4500,
    lastInteraction: 'Contato inicial pelo site, filha solicita cotação para equipe de enfermagem 24h para o pai pós-AVC.',
    notes: 'Contato inicial pelo site, filha solicita cotação para equipe de enfermagem 24h para o pai pós-AVC.',
    createdAt: getRelativeDate(-5)
  },
  {
    id: 'lead-2',
    tenantId: 'sp',
    name: 'Roberto Medeiros',
    phone: '(11) 99999-5555',
    email: 'roberto.m@demo.com',
    status: 'avaliacao',
    source: 'Google Ads',
    estimatedValue: 3200,
    lastInteraction: 'Visita de avaliação técnica agendada pelo enfermeiro coordenador para amanhã às 15:00.',
    notes: 'Visita de avaliação técnica agendada pelo enfermeiro coordenador para amanhã às 15:00.',
    createdAt: getRelativeDate(-3)
  },
  {
    id: 'lead-3',
    tenantId: 'sp',
    name: 'Cláudio Ferreira (Mãe: Sra. Ester)',
    phone: '(11) 97777-4444',
    email: 'claudio.f@demo.com',
    status: 'proposta',
    source: 'Indicação Médica',
    estimatedValue: 12000,
    lastInteraction: 'Proposta comercial de Home Care Integral de 24h enviada por e-mail. Negociando coparticipação com o convênio Amil.',
    notes: 'Proposta comercial de Home Care Integral de 24h enviada por e-mail. Negociando coparticipação com o convênio Amil.',
    createdAt: getRelativeDate(-10)
  },
  {
    id: 'lead-4',
    tenantId: 'sp',
    name: 'Sandra Helena',
    phone: '(11) 96666-3333',
    email: 'sandra.helena@demo.com',
    status: 'fechado',
    source: 'Busca Orgânica',
    estimatedValue: 2800,
    lastInteraction: 'Contrato assinado para reabilitação intensiva pós-fratura de fêmur (10 sessões de fisio + enfermagem semanal).',
    notes: 'Contrato assinado para reabilitação intensiva pós-fratura de fêmur (10 sessões de fisio + enfermagem semanal).',
    createdAt: getRelativeDate(-12)
  }
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    tenantId: 'sp',
    patientId: 'pat-1',
    sender: 'patient',
    text: 'Olá, gostaria de confirmar se o fisioterapeuta Carlos virá hoje de manhã no mesmo horário?',
    timestamp: '2026-07-20T08:15:00Z',
    read: false
  },
  {
    id: 'msg-2',
    tenantId: 'sp',
    patientId: 'pat-1',
    sender: 'operator',
    text: 'Olá, bom dia! Sim, a sessão do Sr. Carlos com a Dona Francisca está confirmada para as 10:30 hoje.',
    timestamp: '2026-07-20T08:18:00Z',
    read: true
  },
  {
    id: 'msg-3',
    tenantId: 'sp',
    patientId: 'pat-1',
    sender: 'patient',
    text: 'Excelente, muito obrigada pela agilidade de vocês!',
    timestamp: '2026-07-20T08:20:00Z',
    read: false
  },
  {
    id: 'msg-4',
    tenantId: 'sp',
    patientId: 'pat-2',
    sender: 'system',
    text: '[Lembrete de Visita] Olá, a visita do fisioterapeuta Carlos está agendada para hoje às 10:30.',
    timestamp: '2026-07-20T07:00:00Z',
    read: true
  }
];

const INITIAL_MEDICINES: Medicine[] = [
  { id: 'med-1', tenantId: 'sp', name: 'Aricept (Donepezila)', dosage: '10mg', manufacturer: 'Pfizer', expiryDate: getRelativeDate(120), quantity: 45, minQuantity: 10 },
  { id: 'med-2', tenantId: 'sp', name: 'Losartana Potássica', dosage: '50mg', manufacturer: 'Medley', expiryDate: getRelativeDate(240), quantity: 90, minQuantity: 20 },
  { id: 'med-3', tenantId: 'sp', name: 'Clexane (Enoxaparina)', dosage: '40mg SC', manufacturer: 'Sanofi', expiryDate: getRelativeDate(14), quantity: 3, minQuantity: 5 }, // Low stock & near expiry alert!
  { id: 'med-4', tenantId: 'sp', name: 'Fenobarbital', dosage: '100mg', manufacturer: 'Cristália', expiryDate: getRelativeDate(8), quantity: 30, minQuantity: 5 } // Near expiry!
];

const INITIAL_SURVEYS: SurveyResponse[] = [
  { id: 'srv-1', tenantId: 'sp', visitId: 'v-1', patientId: 'pat-1', professionalId: 'prof-1', rating: 5, comment: 'Dra. Mariana é excelente, extremamente atenciosa e pontual.', date: getRelativeDate(-2), channel: 'whatsapp', sentAt: new Date(Date.now() - 172800000).toISOString(), respondedAt: new Date(Date.now() - 172000000).toISOString() },
  { id: 'srv-2', tenantId: 'sp', visitId: 'v-2', patientId: 'pat-2', professionalId: 'prof-2', rating: 4, comment: 'Ótimo atendimento do Carlos, muito prestativo.', date: getRelativeDate(-1), channel: 'sms', sentAt: new Date(Date.now() - 86400000).toISOString(), respondedAt: new Date(Date.now() - 85000000).toISOString() }
];

const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  channel: 'whatsapp',
  autoSend: true,
  messageTemplate: 'Olá! Gostaríamos de saber como foi o atendimento de hoje com o(a) profissional {professional_name}. Por favor, avalie em uma escala de 1 a 5 estrelas clicando no link: {survey_link}'
};

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  maxDaysWithoutVisit: 7,
  expiryWarningDays: 30,
  lowStockThreshold: 5,
  enableSystemNotifications: true
};

// Helper to persist to localStorage safely
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(`homecare_pro_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(`homecare_pro_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage`, error);
  }
};

export const useHomeCareStore = create<HomeCareState>((set, get) => ({
  tenants: INITIAL_TENANTS,
  activeTenantId: loadFromStorage('activeTenantId', 'sp'),
  patients: loadFromStorage('patients', INITIAL_PATIENTS),
  professionals: loadFromStorage('professionals', INITIAL_PROFESSIONALS),
  visits: loadFromStorage('visits', INITIAL_VISITS),
  leads: loadFromStorage('leads', INITIAL_LEADS),
  messages: loadFromStorage('messages', INITIAL_MESSAGES),
  medicines: loadFromStorage('medicines', INITIAL_MEDICINES),
  surveys: loadFromStorage('surveys', INITIAL_SURVEYS),
  surveyConfig: loadFromStorage('surveyConfig', DEFAULT_SURVEY_CONFIG),
  alertConfig: loadFromStorage('alertConfig', DEFAULT_ALERT_CONFIG),
  isOffline: loadFromStorage('isOffline', false),
  offlineSyncQueue: loadFromStorage('offlineSyncQueue', []),
  offlineLogs: loadFromStorage('offlineLogs', ['[SISTEMA]: Sistema online e conectado com o servidor de IA.']),

  setActiveTenant: (id) => {
    set({ activeTenantId: id });
    saveToStorage('activeTenantId', id);
  },

  setOfflineMode: (offline) => {
    const previous = get().isOffline;
    if (previous === offline) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const newLogs = [...get().offlineLogs];
    
    if (offline) {
      newLogs.push(`[${timestamp}] [SISTEMA] ⚠️ Modo Offline Ativado. Operando sem conexão.`);
      set({ isOffline: true, offlineLogs: newLogs });
      saveToStorage('isOffline', true);
      saveToStorage('offlineLogs', newLogs);
    } else {
      newLogs.push(`[${timestamp}] [SISTEMA] 🌐 Conexão de Internet Reestabelecida!`);
      set({ isOffline: false, offlineLogs: newLogs });
      saveToStorage('isOffline', false);
      saveToStorage('offlineLogs', newLogs);
      // Auto-trigger sync
      get().syncOfflineData();
    }
  },

  syncOfflineData: async () => {
    const queue = get().offlineSyncQueue;
    if (queue.length === 0) {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const logs = [...get().offlineLogs, `[${timestamp}] [SYNC] Nenhum dado offline pendente de sincronização.`];
      set({ offlineLogs: logs });
      saveToStorage('offlineLogs', logs);
      return;
    }

    const timestampStart = new Date().toLocaleTimeString('pt-BR');
    let logs = [...get().offlineLogs, `[${timestampStart}] [SYNC] 🔄 Sincronizando ${queue.length} ações de campo acumuladas offline...`];
    set({ offlineLogs: logs });

    // Process each item in sequence
    for (const item of queue) {
      const timestampItem = new Date().toLocaleTimeString('pt-BR');
      const visit = get().visits.find(v => v.id === item.visitId);
      const patient = visit ? get().patients.find(p => p.id === visit.patientId) : null;
      
      if (!visit) {
        logs = [...logs, `[${timestampItem}] [SYNC] ❌ Erro: Visita ${item.visitId} não encontrada.`];
        continue;
      }

      if (item.type === 'checkIn') {
        logs = [...logs, `[${timestampItem}] [SYNC] ✓ Sincronizado Check-in de ${patient?.name || 'Paciente'} (Visita ${item.visitId})`];
      } else if (item.type === 'checkOut') {
        logs = [...logs, `[${timestampItem}] [SYNC] 🧠 Processando Check-out e enviando evolução clínica para o modelo de IA...`];
        set({ offlineLogs: logs });

        const { vitals, rawNotes, report, usedMeds } = item.payload;
        let finalReport = report || '';

        if (rawNotes && vitals) {
          try {
            // Re-generate report via AI to enrich it
            const enrichedReport = await get().generateVisitReportAi(item.visitId, rawNotes, vitals);
            if (enrichedReport && !enrichedReport.includes('Erro')) {
              let medsReport = "";
              if (usedMeds && usedMeds.length > 0) {
                medsReport = "\n\n[Medicamentos Utilizados e Baixados do Estoque]:\n" + usedMeds.map(u => `- ${u.name}: ${u.qty} un`).join("\n");
              }
              finalReport = enrichedReport + medsReport;
              
              // Update visit report with enriched one
              const updatedVisits = get().visits.map(v => v.id === item.visitId ? { ...v, report: finalReport } : v);
              set({ visits: updatedVisits });
              saveToStorage('visits', updatedVisits);
            }
          } catch (err) {
            console.error("AI Enrichment failed during sync, keeping local report", err);
          }
        }
        
        // Trigger satisfaction survey post-sync since now we are online!
        const config = get().surveyConfig;
        if (config && config.autoSend) {
          const surveyId = `srv-${Date.now()}`;
          const newSurvey: SurveyResponse = {
            id: surveyId,
            tenantId: get().activeTenantId,
            visitId: visit.id,
            patientId: visit.patientId,
            professionalId: visit.professionalId,
            rating: 0,
            date: getRelativeDate(0),
            channel: config.channel,
            sentAt: new Date().toISOString()
          };

          const updatedSurveys = [...get().surveys, newSurvey];
          set({ surveys: updatedSurveys });
          saveToStorage('surveys', updatedSurveys);

          const prof = get().professionals.find(p => p.id === visit.professionalId);
          const messageText = config.messageTemplate
            .replace('{professional_name}', prof?.name || 'técnico')
            .replace('{survey_link}', `https://homecare.pro/survey/${surveyId}`);

          get().sendMessage(visit.patientId, messageText, 'system');
        }

        logs = [...logs, `[${timestampItem}] [SYNC] ✓ Sincronizado Check-out de ${patient?.name || 'Paciente'} com sucesso.`];
      }
    }

    const timestampEnd = new Date().toLocaleTimeString('pt-BR');
    logs = [...logs, `[${timestampEnd}] [SYNC] 🎉 Sincronização concluída com sucesso! Todos os dados estão atualizados no servidor.`];
    
    set({ 
      offlineSyncQueue: [], 
      offlineLogs: logs 
    });
    saveToStorage('offlineSyncQueue', []);
    saveToStorage('offlineLogs', logs);
  },

  clearOfflineQueue: () => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const logs = [...get().offlineLogs, `[${timestamp}] [SISTEMA] Fila de sincronização limpa pelo usuário.`];
    set({ offlineSyncQueue: [], offlineLogs: logs });
    saveToStorage('offlineSyncQueue', []);
    saveToStorage('offlineLogs', logs);
  },

  // Patient Actions
  addPatient: (patient) => {
    const newPatient: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      tenantId: get().activeTenantId,
      files: [],
      timeline: [{
        id: `t-${Date.now()}`,
        date: getRelativeDate(0),
        title: 'Paciente Cadastrado',
        description: 'Prontuário domiciliar criado no sistema.',
        type: 'system',
        author: 'Sistema'
      }]
    };
    const updated = [...get().patients, newPatient];
    set({ patients: updated });
    saveToStorage('patients', updated);
  },

  updatePatient: (id, data) => {
    const updated = get().patients.map(p => p.id === id ? { ...p, ...data } : p);
    set({ patients: updated });
    saveToStorage('patients', updated);
  },

  deletePatient: (id) => {
    const updated = get().patients.filter(p => p.id !== id);
    set({ patients: updated });
    saveToStorage('patients', updated);
  },

  addPatientFile: (patientId, name, size, type) => {
    const newFile = {
      id: `file-${Date.now()}`,
      name,
      size,
      uploadedAt: getRelativeDate(0),
      type
    };
    const updatedPatients = get().patients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          files: [...p.files, newFile],
          timeline: [
            ...p.timeline,
            {
              id: `t-${Date.now()}`,
              date: getRelativeDate(0),
              title: 'Arquivo anexado',
              description: `O arquivo ${name} foi anexado ao prontuário.`,
              type: 'system' as const,
              author: 'Operador'
            }
          ]
        };
      }
      return p;
    });
    set({ patients: updatedPatients });
    saveToStorage('patients', updatedPatients);
  },

  addTimelineEvent: (patientId, event) => {
    const newEvent = {
      id: `t-${Date.now()}`,
      date: getRelativeDate(0),
      ...event
    };
    const updatedPatients = get().patients.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          timeline: [...p.timeline, newEvent]
        };
      }
      return p;
    });
    set({ patients: updatedPatients });
    saveToStorage('patients', updatedPatients);
  },

  // Professional Actions
  addProfessional: (professional) => {
    const newProfessional: Professional = {
      ...professional,
      id: `prof-${Date.now()}`,
      tenantId: get().activeTenantId,
      rating: 5.0
    };
    const updated = [...get().professionals, newProfessional];
    set({ professionals: updated });
    saveToStorage('professionals', updated);
  },

  updateProfessional: (id, data) => {
    const updated = get().professionals.map(p => p.id === id ? { ...p, ...data } : p);
    set({ professionals: updated });
    saveToStorage('professionals', updated);
  },

  deleteProfessional: (id) => {
    const updated = get().professionals.filter(p => p.id !== id);
    set({ professionals: updated });
    saveToStorage('professionals', updated);
  },

  // Visit Actions
  addVisit: (visit) => {
    const newVisit: Visit = {
      ...visit,
      id: `v-${Date.now()}`,
      tenantId: get().activeTenantId,
    };
    const updated = [...get().visits, newVisit];
    set({ visits: updated });
    saveToStorage('visits', updated);

    // Update patient timeline
    get().addTimelineEvent(visit.patientId, {
      title: 'Visita Agendada',
      description: `Agendada visita técnica para ${visit.date} das ${visit.timeStart} às ${visit.timeEnd}.`,
      type: 'visit',
      author: 'Sistema'
    });
  },

  updateVisit: (id, data) => {
    const updated = get().visits.map(v => v.id === id ? { ...v, ...data } : v);
    set({ visits: updated });
    saveToStorage('visits', updated);
  },

  deleteVisit: (id) => {
    const updated = get().visits.filter(v => v.id !== id);
    set({ visits: updated });
    saveToStorage('visits', updated);
  },

  checkInVisit: (id, location) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map(v => v.id === id ? {
      ...v,
      status: 'em_andamento' as VisitStatus,
      checkInTime: timeString,
      checkInLocation: location
    } : v);
    set({ visits: updated });
    saveToStorage('visits', updated);

    // Get visit to record in patient timeline
    const visit = get().visits.find(v => v.id === id);
    if (visit) {
      const prof = get().professionals.find(p => p.id === visit.professionalId);
      const isOff = get().isOffline;
      get().addTimelineEvent(visit.patientId, {
        title: 'Check-in Realizado' + (isOff ? ' (Offline)' : ''),
        description: `Profissional ${prof?.name || 'técnico'} iniciou o atendimento domiciliar às ${timeString}.` + (isOff ? ' [Aguardando sincronização]' : ''),
        type: 'visit',
        author: prof?.name || 'Sistema'
      });
    }

    if (get().isOffline) {
      const newItem: OfflineSyncItem = {
        id: `sync-${Date.now()}`,
        type: 'checkIn',
        visitId: id,
        timestamp: new Date().toISOString(),
        synced: false,
        payload: { location }
      };
      const updatedQueue = [...get().offlineSyncQueue, newItem];
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const newLogs = [...get().offlineLogs, `[${timestamp}] [OFFLINE] Check-in da visita ${id} enfileirado localmente.`];
      set({ offlineSyncQueue: updatedQueue, offlineLogs: newLogs });
      saveToStorage('offlineSyncQueue', updatedQueue);
      saveToStorage('offlineLogs', newLogs);
    }
  },

  checkOutVisit: (id, location, report, vitals, rawNotes, usedMeds) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map(v => v.id === id ? {
      ...v,
      status: 'concluida' as VisitStatus,
      checkOutTime: timeString,
      checkOutLocation: location,
      report
    } : v);
    set({ visits: updated });
    saveToStorage('visits', updated);

    // Get visit to record in patient timeline
    const visit = get().visits.find(v => v.id === id);
    if (visit) {
      const prof = get().professionals.find(p => p.id === visit.professionalId);
      const isOff = get().isOffline;
      get().addTimelineEvent(visit.patientId, {
        title: 'Atendimento Domiciliar Concluído' + (isOff ? ' (Offline)' : ''),
        description: `Profissional ${prof?.name || 'técnico'} finalizou a visita às ${timeString}. Relatório gerado com sucesso.` + (isOff ? ' [Aguardando sincronização]' : ''),
        type: 'clinical',
        author: prof?.name || 'Sistema'
      });

      // Satisfaction survey trigger
      if (!isOff) {
        const config = get().surveyConfig;
        if (config && config.autoSend) {
          const surveyId = `srv-${Date.now()}`;
          const newSurvey: SurveyResponse = {
            id: surveyId,
            tenantId: get().activeTenantId,
            visitId: visit.id,
            patientId: visit.patientId,
            professionalId: visit.professionalId,
            rating: 0, // 0 = pending response
            date: getRelativeDate(0),
            channel: config.channel,
            sentAt: new Date().toISOString()
          };

          const updatedSurveys = [...get().surveys, newSurvey];
          set({ surveys: updatedSurveys });
          saveToStorage('surveys', updatedSurveys);

          // Send simulated WhatsApp/SMS text message to patient
          const messageText = config.messageTemplate
            .replace('{professional_name}', prof?.name || 'técnico')
            .replace('{survey_link}', `https://homecare.pro/survey/${surveyId}`);

          get().sendMessage(visit.patientId, messageText, 'system');
        }
      }
    }

    if (get().isOffline) {
      const newItem: OfflineSyncItem = {
        id: `sync-${Date.now()}`,
        type: 'checkOut',
        visitId: id,
        timestamp: new Date().toISOString(),
        synced: false,
        payload: { location, report, vitals, rawNotes, usedMeds }
      };
      const updatedQueue = [...get().offlineSyncQueue, newItem];
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const newLogs = [...get().offlineLogs, `[${timestamp}] [OFFLINE] Check-out da visita ${id} enfileirado localmente (sinais vitais e anotações armazenadas).`];
      set({ offlineSyncQueue: updatedQueue, offlineLogs: newLogs });
      saveToStorage('offlineSyncQueue', updatedQueue);
      saveToStorage('offlineLogs', newLogs);
    }
  },

  // CRM Actions
  addLead: (lead) => {
    const newLead: CRMLead = {
      ...lead,
      id: `lead-${Date.now()}`,
      tenantId: get().activeTenantId,
      createdAt: getRelativeDate(0)
    };
    const updated = [...get().leads, newLead];
    set({ leads: updated });
    saveToStorage('leads', updated);
  },

  updateLead: (id, data) => {
    const updated = get().leads.map(l => l.id === id ? { ...l, ...data } : l);
    set({ leads: updated });
    saveToStorage('leads', updated);
  },

  deleteLead: (id) => {
    const updated = get().leads.filter(l => l.id !== id);
    set({ leads: updated });
    saveToStorage('leads', updated);
  },

  // Message Actions
  sendMessage: (patientId, text, sender) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      tenantId: get().activeTenantId,
      patientId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      read: true
    };
    const updated = [...get().messages, newMessage];
    set({ messages: updated });
    saveToStorage('messages', updated);
  },

  receiveMessage: (patientId, text) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      tenantId: get().activeTenantId,
      patientId,
      sender: 'patient',
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    const updated = [...get().messages, newMessage];
    set({ messages: updated });
    saveToStorage('messages', updated);
  },

  markMessagesRead: (patientId) => {
    const updated = get().messages.map(m => m.patientId === patientId ? { ...m, read: true } : m);
    set({ messages: updated });
    saveToStorage('messages', updated);
  },

  // AI Connectors (Calling Server endpoints)
  generateAiSummary: async (patientId) => {
    const patient = get().patients.find(p => p.id === patientId);
    if (!patient) return "Paciente não encontrado.";

    try {
      const res = await fetch("/api/gemini/summarize-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient })
      });
      const data = await res.json();
      if (data.summary) {
        // Update local state to cache this summary
        get().updatePatient(patientId, { summaryAi: data.summary });
        return data.summary;
      }
      return "Erro ao extrair resumo da IA.";
    } catch (err) {
      console.error(err);
      return "Não foi possível se conectar ao servidor de inteligência artificial.";
    }
  },

  generateVisitReportAi: async (visitId, rawNotes, vitals) => {
    const visit = get().visits.find(v => v.id === visitId);
    if (!visit) return "Visita não encontrada.";

    const patient = get().patients.find(p => p.id === visit.patientId);
    const professional = get().professionals.find(p => p.id === visit.professionalId);

    try {
      const res = await fetch("/api/gemini/generate-visit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient?.name,
          professionalName: professional?.name,
          rawNotes,
          vitals
        })
      });
      const data = await res.json();
      return data.report || "Erro ao gerar evolução clínica de enfermagem.";
    } catch (err) {
      console.error(err);
      return "Erro de conexão com o servidor de IA. Por favor, tente novamente.";
    }
  },

  suggestScheduleAi: async () => {
    const activeTenantId = get().activeTenantId;
    const filteredVisits = get().visits.filter(v => v.tenantId === activeTenantId);
    const filteredProfessionals = get().professionals.filter(p => p.tenantId === activeTenantId);
    const filteredPatients = get().patients.filter(p => p.tenantId === activeTenantId);

    try {
      const res = await fetch("/api/gemini/suggest-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visits: filteredVisits,
          professionals: filteredProfessionals,
          patients: filteredPatients
        })
      });
      const data = await res.json();
      return data.suggestion || "Não foi possível estruturar sugestões de agenda.";
    } catch (err) {
      console.error(err);
      return "Houve uma interrupção ao contatar o servidor de IA para organizar a escala de campo.";
    }
  },

  // Medicine Actions
  addMedicine: (medicine) => {
    const newMedicine: Medicine = {
      ...medicine,
      id: `med-${Date.now()}`,
      tenantId: get().activeTenantId,
    };
    const updated = [...get().medicines, newMedicine];
    set({ medicines: updated });
    saveToStorage('medicines', updated);
  },

  updateMedicine: (id, data) => {
    const updated = get().medicines.map(m => m.id === id ? { ...m, ...data } : m);
    set({ medicines: updated });
    saveToStorage('medicines', updated);
  },

  deleteMedicine: (id) => {
    const updated = get().medicines.filter(m => m.id !== id);
    set({ medicines: updated });
    saveToStorage('medicines', updated);
  },

  consumeMedicine: (id, qty) => {
    let success = false;
    const updated = get().medicines.map(m => {
      if (m.id === id) {
        if (m.quantity >= qty) {
          success = true;
          return { ...m, quantity: m.quantity - qty };
        }
      }
      return m;
    });
    if (success) {
      set({ medicines: updated });
      saveToStorage('medicines', updated);
    }
    return success;
  },

  // Survey Actions
  updateSurveyConfig: (config) => {
    const updated = { ...get().surveyConfig, ...config };
    set({ surveyConfig: updated });
    saveToStorage('surveyConfig', updated);
  },

  addSurveyResponse: (survey) => {
    const newSurvey: SurveyResponse = {
      ...survey,
      id: `srv-${Date.now()}`,
      tenantId: get().activeTenantId,
    };
    const updated = [...get().surveys, newSurvey];
    set({ surveys: updated });
    saveToStorage('surveys', updated);
  },

  respondToSurvey: (id, rating, comment) => {
    const updated = get().surveys.map(s => s.id === id ? {
      ...s,
      rating,
      comment,
      respondedAt: new Date().toISOString()
    } : s);
    set({ surveys: updated });
    saveToStorage('surveys', updated);
  },

  // Alert Actions
  updateAlertConfig: (config) => {
    const updated = { ...get().alertConfig, ...config };
    set({ alertConfig: updated });
    saveToStorage('alertConfig', updated);
  },

  getCalculatedAlerts: () => {
    const activeTenantId = get().activeTenantId;
    const config = get().alertConfig || { maxDaysWithoutVisit: 7, expiryWarningDays: 30, lowStockThreshold: 5 };
    const today = new Date();
    const alerts: ClinicalAlert[] = [];

    // 1. Check for patients without recent visits
    const tenantPatients = get().patients.filter(p => p.tenantId === activeTenantId && p.status === 'active');
    const tenantVisits = get().visits.filter(v => v.tenantId === activeTenantId && v.status === 'concluida');

    tenantPatients.forEach(p => {
      const patientVisits = tenantVisits.filter(v => v.patientId === p.id);
      if (patientVisits.length === 0) {
        alerts.push({
          id: `alert-novisit-${p.id}`,
          patientId: p.id,
          type: 'no_visit',
          severity: 'critical',
          title: 'Paciente Sem Visita Recente',
          description: `O paciente ${p.name} está cadastrado no sistema mas ainda não possui nenhuma visita finalizada registrada.`,
          date: getRelativeDate(0)
        });
      } else {
        const sortedVisits = [...patientVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastVisitDate = new Date(sortedVisits[0].date);
        
        // Calculate difference in days
        const diffTime = Math.abs(today.getTime() - lastVisitDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > config.maxDaysWithoutVisit) {
          alerts.push({
            id: `alert-novisit-${p.id}`,
            patientId: p.id,
            type: 'no_visit',
            severity: diffDays > config.maxDaysWithoutVisit * 2 ? 'critical' : 'warning',
            title: 'Paciente Sem Visita Recente',
            description: `O paciente ${p.name} está sem visitas há ${diffDays} dias (Limite: ${config.maxDaysWithoutVisit} dias).`,
            date: getRelativeDate(0)
          });
        }
      }
    });

    // 2. Check for medicine alerts (near expiry, expired, low stock)
    const tenantMedicines = get().medicines.filter(m => m.tenantId === activeTenantId);
    tenantMedicines.forEach(m => {
      // Check stock
      if (m.quantity <= m.minQuantity) {
        alerts.push({
          id: `alert-lowstock-${m.id}`,
          medicineId: m.id,
          type: 'low_stock',
          severity: m.quantity === 0 ? 'critical' : 'warning',
          title: 'Estoque Baixo de Medicamento',
          description: `O medicamento ${m.name} (${m.dosage}) está com apenas ${m.quantity} unidades em estoque (Quantidade Mínima: ${m.minQuantity}).`,
          date: getRelativeDate(0)
        });
      }

      // Check expiry
      const expDate = new Date(m.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        alerts.push({
          id: `alert-expired-${m.id}`,
          medicineId: m.id,
          type: 'expiry',
          severity: 'critical',
          title: 'Medicamento Vencido no Estoque',
          description: `O medicamento ${m.name} (${m.dosage}) venceu há ${Math.abs(diffDays)} dias (${m.expiryDate}).`,
          date: getRelativeDate(0)
        });
      } else if (diffDays <= config.expiryWarningDays) {
        alerts.push({
          id: `alert-near-expiry-${m.id}`,
          medicineId: m.id,
          type: 'expiry',
          severity: diffDays <= 7 ? 'critical' : 'warning',
          title: 'Medicamento Próximo ao Vencimento',
          description: `O medicamento ${m.name} (${m.dosage}) vencerá em ${diffDays} dias (${m.expiryDate}).`,
          date: getRelativeDate(0)
        });
      }
    });

    return alerts;
  }
}));
