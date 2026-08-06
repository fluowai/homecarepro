import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './lib/supabase';
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
  OfflineSyncItem,
  TriageResult,
  HealthInsurance,
} from './types';

// ── Auth & Profile ──────────────────────────────────────────────
interface UserProfile {
  id: string;
  tenant_id: string;
  full_name: string;
  role: string;
  avatar_url: string;
}

// ── Mapping: camelCase ↔ snake_case ─────────────────────────────

function patientToRow(p: Patient) {
  return {
    id: p.id,
    tenant_id: p.tenantId,
    name: p.name,
    birth_date: p.birthDate,
    cpf: p.cpf,
    gender: p.gender,
    phone: p.phone,
    email: p.email,
    status: p.status,
    plan_type: p.planType,
    insurance_id: p.insuranceId,
    monthly_package_value: p.monthlyPackageValue,
    pad_scope: p.padScope,
    avatar: p.avatar,
    diagnostic: p.diagnostic,
    allergies: p.allergies,
    medications: p.medications,
    files: p.files,
    timeline: p.timeline,
    inventory: p.inventory,
    address: p.address,
    summary_ai: p.summaryAi ?? '',
  };
}

function patientFromRow(r: Record<string, unknown>): Patient {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    birthDate: r.birth_date as string,
    cpf: r.cpf as string,
    gender: r.gender as 'M' | 'F' | 'O' | undefined,
    phone: r.phone as string,
    email: r.email as string,
    status: r.status as Patient['status'],
    planType: r.plan_type as string,
    insuranceId: r.insurance_id as string | undefined,
    monthlyPackageValue: Number(r.monthly_package_value) || undefined,
    padScope: r.pad_scope as string | undefined,
    avatar: r.avatar as string,
    diagnostic: r.diagnostic as string,
    allergies: (r.allergies ?? []) as string[],
    medications: (r.medications ?? []) as string[],
    files: (r.files ?? []) as Patient['files'],
    timeline: (r.timeline ?? []) as Patient['timeline'],
    inventory: (r.inventory ?? []) as Patient['inventory'],
    address: (r.address ?? { street: '', number: '', city: '', state: '', zipCode: '' }) as Patient['address'],
    summaryAi: (r.summary_ai as string) || undefined,
  };
}

function professionalToRow(p: Professional) {
  return {
    id: p.id,
    tenant_id: p.tenantId,
    name: p.name,
    specialty: p.specialty,
    cpf: p.cpf,
    gender: p.gender,
    registration: p.registration,
    status: p.status,
    email: p.email,
    phone: p.phone,
    avatar: p.avatar,
    rating: p.rating,
    address: p.address,
    documents: p.documents,
    stamp_signature_url: p.stampSignatureUrl,
  };
}

function professionalFromRow(r: Record<string, unknown>): Professional {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    specialty: r.specialty as Professional['specialty'],
    cpf: r.cpf as string,
    gender: r.gender as 'M' | 'F' | 'O',
    registration: r.registration as string,
    status: r.status as Professional['status'],
    email: r.email as string,
    phone: r.phone as string,
    avatar: r.avatar as string,
    rating: Number(r.rating) || 5.0,
    address: (r.address ?? { street: '', number: '', city: '', state: '', zipCode: '' }) as Professional['address'],
    documents: (r.documents ?? []) as Professional['documents'],
    stampSignatureUrl: r.stamp_signature_url as string | undefined,
  };
}

function visitToRow(v: Visit) {
  return {
    id: v.id,
    tenant_id: v.tenantId,
    patient_id: v.patientId,
    professional_id: v.professionalId,
    date: v.date,
    time_start: v.timeStart,
    time_end: v.timeEnd,
    status: v.status,
    check_in_time: v.checkInTime ?? null,
    check_out_time: v.checkOutTime ?? null,
    check_in_location: v.checkInLocation ?? null,
    check_out_location: v.checkOutLocation ?? null,
    check_in_coords: v.checkInCoords ? `${v.checkInCoords.lat},${v.checkInCoords.lng}` : null,
    check_out_coords: v.checkOutCoords ? `${v.checkOutCoords.lat},${v.checkOutCoords.lng}` : null,
    report: v.report ?? '',
    value: v.value,
  };
}

function visitFromRow(r: Record<string, unknown>): Visit {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    patientId: r.patient_id as string,
    professionalId: r.professional_id as string,
    date: r.date as string,
    timeStart: r.time_start as string,
    timeEnd: r.time_end as string,
    status: r.status as VisitStatus,
    checkInTime: (r.check_in_time as string) ?? undefined,
    checkOutTime: (r.check_out_time as string) ?? undefined,
    checkInLocation: (r.check_in_location as string) ?? undefined,
    checkOutLocation: (r.check_out_location as string) ?? undefined,
    checkInCoords: r.check_in_coords ? { lat: Number((r.check_in_coords as string).split(',')[0]), lng: Number((r.check_in_coords as string).split(',')[1]) } : undefined,
    checkOutCoords: r.check_out_coords ? { lat: Number((r.check_out_coords as string).split(',')[0]), lng: Number((r.check_out_coords as string).split(',')[1]) } : undefined,
    report: (r.report as string) || undefined,
    value: Number(r.value) || 0,
  };
}

function leadToRow(l: CRMLead) {
  return {
    id: l.id,
    tenant_id: l.tenantId,
    name: l.name,
    phone: l.phone,
    email: l.email,
    status: l.status,
    source: l.source,
    estimated_value: l.estimatedValue,
    last_interaction: l.lastInteraction,
    notes: l.notes,
    created_at: l.createdAt,
  };
}

function leadFromRow(r: Record<string, unknown>): CRMLead {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    phone: r.phone as string,
    email: r.email as string,
    status: r.status as CRMLead['status'],
    source: r.source as string,
    estimatedValue: Number(r.estimated_value) || 0,
    lastInteraction: r.last_interaction as string,
    notes: r.notes as string,
    createdAt: r.created_at as string,
  };
}

function messageToRow(m: Message) {
  return {
    id: m.id,
    tenant_id: m.tenantId,
    patient_id: m.patientId,
    sender: m.sender,
    text: m.text,
    timestamp: m.timestamp,
    read: m.read,
  };
}

function messageFromRow(r: Record<string, unknown>): Message {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    patientId: r.patient_id as string,
    sender: r.sender as Message['sender'],
    text: r.text as string,
    timestamp: r.timestamp as string,
    read: r.read as boolean,
  };
}

function medicineToRow(m: Medicine) {
  return {
    id: m.id,
    tenant_id: m.tenantId,
    name: m.name,
    dosage: m.dosage,
    manufacturer: m.manufacturer,
    expiry_date: m.expiryDate,
    quantity: m.quantity,
    min_quantity: m.minQuantity,
  };
}

function medicineFromRow(r: Record<string, unknown>): Medicine {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    dosage: r.dosage as string,
    manufacturer: r.manufacturer as string,
    expiryDate: r.expiry_date as string,
    quantity: Number(r.quantity) || 0,
    minQuantity: Number(r.min_quantity) || 0,
  };
}

function surveyToRow(s: SurveyResponse) {
  return {
    id: s.id,
    tenant_id: s.tenantId,
    visit_id: s.visitId,
    patient_id: s.patientId,
    professional_id: s.professionalId,
    rating: s.rating,
    comment: s.comment ?? '',
    date: s.date,
    channel: s.channel,
    sent_at: s.sentAt,
    responded_at: s.respondedAt ?? null,
  };
}

function surveyFromRow(r: Record<string, unknown>): SurveyResponse {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    visitId: r.visit_id as string,
    patientId: r.patient_id as string,
    professionalId: r.professional_id as string,
    rating: Number(r.rating) || 0,
    comment: (r.comment as string) || undefined,
    date: r.date as string,
    channel: r.channel as SurveyResponse['channel'],
    sentAt: r.sent_at as string,
    respondedAt: (r.responded_at as string) ?? undefined,
  };
}

// ── Store interface ─────────────────────────────────────────────

interface HomeCareState {
  // Auth
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initError: string | null;

  // Data
  tenants: Tenant[];
  activeTenantId: string;
  patients: Patient[];
  professionals: Professional[];
  insurances: HealthInsurance[];
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

  // RBAC
  currentUserRole: 'mega_admin' | 'super_admin' | 'admin' | 'auditor' | 'professional' | 'patient' | 'system_support';
  setCurrentUserRole: (role: 'mega_admin' | 'super_admin' | 'admin' | 'auditor' | 'professional' | 'patient' | 'system_support') => void;

  // Auth actions
  init: () => Promise<void>;
  signOut: () => Promise<void>;

  // Actions
  setActiveTenant: (id: string) => void;
  addTenant: (tenant: Omit<Tenant, 'id'> & { id?: string }) => void;
  updateTenant: (id: string, updates: Partial<Tenant>) => void;

  // Offline/Sync Actions
  setOfflineMode: (offline: boolean) => void;
  syncOfflineData: () => Promise<void>;
  clearOfflineQueue: () => void;

  // Patient Actions
  addPatient: (patient: Omit<Patient, 'id' | 'tenantId'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addPatientFile: (patientId: string, name: string, size: string, type: string) => void;
  addTimelineEvent: (patientId: string, event: { title: string; description: string; type: 'clinical' | 'visit' | 'system' | 'billing'; author: string; vitals?: { pa?: string; fc?: string; temp?: string; sat?: string; pain?: number }; photos?: string[] }) => void;
  consumePatientInventory: (patientId: string, medicineId: string, qty: number) => void;

  // Professional Actions
  addProfessional: (professional: Omit<Professional, 'id' | 'tenantId'>) => void;
  updateProfessional: (id: string, professional: Partial<Professional>) => void;
  deleteProfessional: (id: string) => void;

  // Insurance Actions
  addInsurance: (insurance: Omit<HealthInsurance, 'id' | 'tenantId'>) => void;
  updateInsurance: (id: string, insurance: Partial<HealthInsurance>) => void;
  deleteInsurance: (id: string) => void;

  // Visit Actions
  addVisit: (visit: Omit<Visit, 'id' | 'tenantId'>) => void;
  updateVisit: (id: string, visit: Partial<Visit>) => void;
  deleteVisit: (id: string) => void;
  checkInVisit: (id: string, location: string, coords?: {lat: number, lng: number}) => void;
  checkOutVisit: (id: string, location: string, report: string, vitals?: { pa: string; fc: string; temp: string; sat: string }, rawNotes?: string, usedMeds?: { id: string; name: string; qty: number }[], coords?: {lat: number, lng: number}) => void;

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

  // AI Helpers
  generateAiSummary: (patientId: string) => Promise<string>;
  generateVisitReportAi: (visitId: string, rawNotes: string, vitals: { pa: string; fc: string; temp: string; sat: string }) => Promise<string>;
  suggestScheduleAi: () => Promise<string>;
  analyzeTriageAi: (description: string, patientAge?: number, mainCondition?: string) => Promise<TriageResult>;
  transcribeAudioAi: (audioData: string, mimeType?: string) => Promise<string>;
}

// ── Helpers ─────────────────────────────────────────────────────

const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(`homecare_pro_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  try {
    localStorage.setItem(`homecare_pro_${key}`, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key} to storage`, err);
  }
};

const isDemoModeEnabled = () => {
  if (isSupabaseConfigured) return false;
  const windowEnv = (window as any).__ENV__;
  const rawValue = (windowEnv && windowEnv.VITE_ENABLE_DEMO_MODE) || import.meta.env.VITE_ENABLE_DEMO_MODE;
  if (rawValue) return rawValue === 'true';
  return import.meta.env.DEV === true;
};

// ── Async Supabase helpers (fire-and-forget) ────────────────────

async function upsertRow(table: string, row: Record<string, unknown>) {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from(table).upsert(row, { onConflict: 'id' });
  } catch (err) {
    console.error(`[Supabase] upsert ${table} failed`, err);
  }
}

async function deleteRow(table: string, id: string) {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from(table).delete().eq('id', id);
  } catch (err) {
    console.error(`[Supabase] delete ${table} failed`, err);
  }
}

// ── Seed data (fallback for demo mode) ──────────────────────────

const INITIAL_TENANTS: Tenant[] = [
  { id: 'sp', name: 'HomeCare Pro São Paulo', logo: '🏥', cnpj: '12.345.678/0001-99', plan: 'Enterprise' },
  { id: 'rj', name: 'Anjos do Lar Rio de Janeiro', logo: '👼', cnpj: '98.765.432/0001-11', plan: 'Pro' },
];

const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'pat-1', tenantId: 'sp', name: 'Dona Francisca Ribeiro Silva', birthDate: '1948-04-12',
    cpf: '123.456.789-00', phone: '(11) 98111-2233', email: 'francisca.silva@demo.com',
    status: 'active', planType: 'Bradesco Saúde',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Alzheimer Estágio Moderado, Hipertensão Arterial e Osteoporose.',
    allergies: ['Penicilina', 'Iodo'],
    medications: ['Aricept (Donepezila) 10mg - 1x ao dia (noite)', 'Losartana 50mg - 2x ao dia', 'Melatonina 3mg - 1x ao dia'],
    files: [
      { id: 'file-1', name: 'Laudo_Neurologia_DrAlvaro.pdf', size: '1.2 MB', uploadedAt: getRelativeDate(-10), type: 'application/pdf' },
      { id: 'file-2', name: 'Exame_Sangue_Junho2026.pdf', size: '840 KB', uploadedAt: getRelativeDate(-4), type: 'application/pdf' },
    ],
    timeline: [
      { id: 't-1', date: getRelativeDate(-15), title: 'Admissão no Homecare', description: 'Paciente integrada ao programa de reabilitação domiciliar pela equipe multidisciplinar.', type: 'system', author: 'Supervisão SP' },
      { id: 't-2', date: getRelativeDate(-12), title: 'Consulta Médica de Admissão', description: 'Dr. Roberto prescreveu plano terapêutico inicial e medicação neurológica.', type: 'clinical', author: 'Dr. Roberto Almeida' },
      { id: 't-3', date: getRelativeDate(-3), title: 'Sessão de Fisioterapia Concluída', description: 'Treino de marcha com andador, excelente tolerância e equilíbrio estável.', type: 'visit', author: 'Carlos Santos' },
      { id: 't-4', date: getRelativeDate(-1), title: 'Entrega de Insumos', description: 'Fraldas geriátricas e soro fisiológico entregues na residência.', type: 'billing', author: 'Logística Pro' },
    ],
    inventory: [
      { medicineId: 'med-1', medicineName: 'Aricept (Donepezila)', quantity: 20, dosage: '10mg' },
      { medicineId: 'med-2', medicineName: 'Losartana Potássica', quantity: 3, dosage: '50mg' },
    ],
    address: { street: 'Rua das Palmeiras', number: '425', city: 'São Paulo', state: 'SP', zipCode: '01226-010' },
    summaryAi: 'Paciente de 78 anos, Alzheimer moderado com comorbidades vasculares. Risco moderado de queda. Alérgica a Penicilina.',
  },
  {
    id: 'pat-2', tenantId: 'sp', name: 'Seu Geraldo de Souza', birthDate: '1942-09-28',
    cpf: '234.567.890-11', phone: '(11) 97222-3344', email: 'geraldo.souza@demo.com',
    status: 'active', planType: 'Particular',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Pós-Operatório de Artroplastia Total de Quadril Direito, Diabetes Mellitus Tipo 2.',
    allergies: ['Dipirona'],
    medications: ['Metformina 850mg - 2x ao dia', 'Clexane 40mg SC - 1x ao dia', 'Tramal 50mg - se dor forte'],
    files: [
      { id: 'file-3', name: 'Alta_Hospitalar_SirioLibanes.pdf', size: '2.1 MB', uploadedAt: getRelativeDate(-12), type: 'application/pdf' },
      { id: 'file-4', name: 'RaioX_Bacia_PosOperatorio.jpg', size: '1.4 MB', uploadedAt: getRelativeDate(-11), type: 'image/jpeg' },
    ],
    timeline: [
      { id: 't-5', date: getRelativeDate(-12), title: 'Alta Hospitalar & Início do Home Care', description: 'Início imediato das sessões de fisioterapia diárias para reabilitação ortopédica.', type: 'system', author: 'Supervisão SP' },
      { id: 't-6', date: getRelativeDate(-8), title: 'Retirada de Pontos Cirúrgicos', description: 'Incisão cirúrgica de bacia com excelente cicatrização, sem sinais de infecção ou secreção.', type: 'clinical', author: 'Dra. Mariana Costa', photos: ['https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=300'] },
      { id: 't-7', date: getRelativeDate(-2), title: 'Treino de Carga Parcial', description: 'Evolução favorável. Iniciada transferência ativa da cama para poltrona com andador.', type: 'visit', author: 'Carlos Santos' },
    ],
    address: { street: 'Avenida Brigadeiro Luís Antônio', number: '2300', city: 'São Paulo', state: 'SP', zipCode: '01318-002' },
    summaryAi: 'Paciente idoso de 84 anos, pós-artroplastia de quadril. Alérgico a Dipirona. Diabetes controlado.',
  },
  {
    id: 'pat-3', tenantId: 'sp', name: 'Ana Júlia de Albuquerque', birthDate: '2016-06-15',
    cpf: '345.678.901-22', phone: '(11) 96333-4455', email: 'mae.anajulia@demo.com',
    status: 'active', planType: 'Unimed',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'Paralisia Cerebral Espástica GMFCS V, Traqueostomizada e Gastrostomizada (GTT).',
    allergies: ['Látex', 'Sulfa'],
    medications: ['Baclofeno 10mg - 1/2 comprimido 3x ao dia', 'Fenobarbital 100mg - 1x ao dia (noite)', 'Gaviscon 5ml - após as refeições'],
    files: [{ id: 'file-5', name: 'Relatorio_Neuropediatria_HC.pdf', size: '3.4 MB', uploadedAt: getRelativeDate(-20), type: 'application/pdf' }],
    timeline: [
      { id: 't-8', date: getRelativeDate(-20), title: 'Instalação de Oxigênio Domiciliar', description: 'Concentrador de O2 e cilindro de backup testados e aprovados pela enfermagem.', type: 'system', author: 'Logística Pro' },
      { id: 't-9', date: getRelativeDate(-10), title: 'Troca de Cânula de Traqueostomia', description: 'Procedimento realizado com sucesso, boa expansibilidade torácica pós-procedimento.', type: 'clinical', author: 'Dr. Roberto Almeida' },
    ],
    address: { street: 'Rua Pamplona', number: '980', city: 'São Paulo', state: 'SP', zipCode: '01405-001' },
  },
  {
    id: 'pat-4', tenantId: 'rj', name: 'Seu Moacyr Guimarães', birthDate: '1939-11-05',
    cpf: '456.789.012-33', phone: '(21) 98222-7788', email: 'moacyr.guimaraes@demo.com',
    status: 'active', planType: 'Particular',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    diagnostic: 'DPOC Grave (Sequela de Tabagismo), Cardiopatia Isquêmica Crônica.',
    allergies: ['Nenhuma relatada'],
    medications: ['Spiriva Respimat - 2 puffs pela manhã', 'AAS 100mg - 1x ao dia', 'Carvedilol 6.25mg - 2x ao dia'],
    files: [],
    timeline: [
      { id: 't-10', date: getRelativeDate(-5), title: 'Admissão RJ', description: 'Início do suporte domiciliar respiratório na filial Rio de Janeiro.', type: 'system', author: 'Supervisão RJ' },
    ],
    address: { street: 'Avenida Atlântica', number: '1200', city: 'Rio de Janeiro', state: 'RJ', zipCode: '22021-001' },
  },
];

const INITIAL_PROFESSIONALS: Professional[] = [
  { id: 'prof-1', tenantId: 'sp', name: 'Dra. Mariana Costa', cpf: '111.111.111-11', gender: 'F', address: { street: 'Rua A', number: '1', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }, documents: [{ type: 'document', name: 'CRM-SP', url: '#', expirationDate: getRelativeDate(120), status: 'valid' }, { type: 'document', name: 'Foto do Carimbo + Assinatura', url: '#', status: 'valid' }], specialty: 'Enfermeiro', registration: 'COREN-SP 432.109', status: 'active', email: 'mariana.costa@homecarepro.com', phone: '(11) 98765-4321', avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120', rating: 4.9 },
  { id: 'prof-2', tenantId: 'sp', name: 'Carlos Santos', cpf: '222.222.222-22', gender: 'M', address: { street: 'Rua B', number: '2', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }, documents: [{ type: 'document', name: 'CREFITO-SP', url: '#', expirationDate: getRelativeDate(-5), status: 'expired' }], specialty: 'Fisioterapeuta', registration: 'CREFITO-SP 98.765', status: 'active', email: 'carlos.fisioterapeuta@homecarepro.com', phone: '(11) 97654-3210', avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120', rating: 5.0 },
  { id: 'prof-3', tenantId: 'sp', name: 'Thiago Silva', cpf: '333.333.333-33', gender: 'M', address: { street: 'Rua C', number: '3', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }, documents: [{ type: 'document', name: 'COREN-TE', url: '#', expirationDate: getRelativeDate(10), status: 'valid' }, { type: 'document', name: 'Comprovante de Endereço', url: '#', status: 'pending' }], specialty: 'Técnico de Enfermagem', registration: 'COREN-TE 112.334', status: 'busy', email: 'thiago.tecnico@homecarepro.com', phone: '(11) 96543-2109', avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120', rating: 4.7 },
  { id: 'prof-4', tenantId: 'sp', name: 'Dr. Roberto Almeida', cpf: '444.444.444-44', gender: 'M', address: { street: 'Rua D', number: '4', city: 'São Paulo', state: 'SP', zipCode: '00000-000' }, documents: [], specialty: 'Médico', registration: 'CRM-SP 180.456', status: 'offline', email: 'roberto.almeida@homecarepro.com', phone: '(11) 95432-1098', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120', rating: 4.9 },
  { id: 'prof-5', tenantId: 'rj', name: 'Dra. Eliane Pires', cpf: '555.555.555-55', gender: 'F', address: { street: 'Rua E', number: '5', city: 'Rio de Janeiro', state: 'RJ', zipCode: '00000-000' }, documents: [{ type: 'document', name: 'COREN-RJ', url: '#', expirationDate: getRelativeDate(50), status: 'valid' }], specialty: 'Enfermeiro', registration: 'COREN-RJ 220.180', status: 'active', email: 'eliane.pires@homecarepro.com', phone: '(21) 98777-6655', avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120', rating: 4.8 },
];

const INITIAL_INSURANCES: HealthInsurance[] = [
  { id: 'ins-1', tenantId: 'sp', name: 'Bradesco Saúde', phone: '0800 701 2700', email: 'contato@bradescosaude.com.br', contactPerson: 'Ana Carolina' },
  { id: 'ins-2', tenantId: 'sp', name: 'SulAmérica', phone: '0800 722 0504', email: 'autorizacoes@sulamerica.com.br', contactPerson: 'Marcos Silva' },
  { id: 'ins-3', tenantId: 'sp', name: 'Amil', phone: '0800 021 2583', email: 'atendimento@amil.com.br' },
  { id: 'ins-4', tenantId: 'rj', name: 'Unimed Rio', phone: '0800 021 0020', email: 'contato@unimedrio.com.br', contactPerson: 'Julia Martins' },
];

const INITIAL_VISITS: Visit[] = [
  { id: 'v-1', tenantId: 'sp', patientId: 'pat-1', professionalId: 'prof-1', date: getRelativeDate(0), timeStart: '08:00', timeEnd: '10:00', status: 'concluida', checkInTime: '07:58', checkOutTime: '10:05', checkInLocation: '-23.5615,-46.6812 (Sede Clínicas)', checkOutLocation: '-23.5617,-46.6815 (Sede Clínicas)', report: 'Visita de enfermagem realizada de rotina. Sinais vitais estáveis.', value: 150 },
  { id: 'v-2', tenantId: 'sp', patientId: 'pat-2', professionalId: 'prof-2', date: getRelativeDate(0), timeStart: '10:30', timeEnd: '11:30', status: 'em_andamento', checkInTime: '10:28', checkInLocation: '-23.5645,-46.6521 (Av Paulista)', value: 180 },
  { id: 'v-3', tenantId: 'sp', patientId: 'pat-3', professionalId: 'prof-3', date: getRelativeDate(0), timeStart: '14:00', timeEnd: '18:00', status: 'agendada', value: 220 },
  { id: 'v-4', tenantId: 'sp', patientId: 'pat-1', professionalId: 'prof-2', date: getRelativeDate(1), timeStart: '09:00', timeEnd: '10:00', status: 'agendada', value: 180 },
  { id: 'v-5', tenantId: 'sp', patientId: 'pat-2', professionalId: 'prof-1', date: getRelativeDate(1), timeStart: '14:00', timeEnd: '15:30', status: 'agendada', value: 150 },
  { id: 'v-6', tenantId: 'rj', patientId: 'pat-4', professionalId: 'prof-5', date: getRelativeDate(0), timeStart: '15:00', timeEnd: '16:30', status: 'agendada', value: 160 },
];

const INITIAL_LEADS: CRMLead[] = [
  { id: 'lead-1', tenantId: 'sp', name: 'Amanda Oliveira (Pai: Sr. Luiz)', phone: '(11) 98888-7766', email: 'amanda@demo.com', status: 'lead', source: 'WhatsApp', estimatedValue: 4500, lastInteraction: 'Contato inicial pelo site.', notes: 'Contato inicial pelo site.', createdAt: getRelativeDate(-5) },
  { id: 'lead-2', tenantId: 'sp', name: 'Roberto Medeiros', phone: '(11) 99999-5555', email: 'roberto.m@demo.com', status: 'avaliacao', source: 'Google Ads', estimatedValue: 3200, lastInteraction: 'Visita de avaliação técnica agendada.', notes: 'Visita de avaliação técnica agendada.', createdAt: getRelativeDate(-3) },
  { id: 'lead-3', tenantId: 'sp', name: 'Cláudio Ferreira (Mãe: Sra. Ester)', phone: '(11) 97777-4444', email: 'claudio.f@demo.com', status: 'proposta', source: 'Indicação Médica', estimatedValue: 12000, lastInteraction: 'Proposta comercial enviada.', notes: 'Proposta comercial enviada.', createdAt: getRelativeDate(-10) },
  { id: 'lead-4', tenantId: 'sp', name: 'Sandra Helena', phone: '(11) 96666-3333', email: 'sandra.helena@demo.com', status: 'fechado', source: 'Busca Orgânica', estimatedValue: 2800, lastInteraction: 'Contrato assinado.', notes: 'Contrato assinado.', createdAt: getRelativeDate(-12) },
];

const INITIAL_MESSAGES: Message[] = [
  { id: 'msg-1', tenantId: 'sp', patientId: 'pat-1', sender: 'patient', text: 'Olá, gostaria de confirmar se o fisioterapeuta Carlos virá hoje?', timestamp: '2026-07-20T08:15:00Z', read: false },
  { id: 'msg-2', tenantId: 'sp', patientId: 'pat-1', sender: 'operator', text: 'Olá, bom dia! Sim, a sessão está confirmada para as 10:30 hoje.', timestamp: '2026-07-20T08:18:00Z', read: true },
  { id: 'msg-3', tenantId: 'sp', patientId: 'pat-1', sender: 'patient', text: 'Excelente, muito obrigada pela agilidade!', timestamp: '2026-07-20T08:20:00Z', read: false },
  { id: 'msg-4', tenantId: 'sp', patientId: 'pat-2', sender: 'system', text: '[Lembrete de Visita] Visita agendada para hoje às 10:30.', timestamp: '2026-07-20T07:00:00Z', read: true },
];

const INITIAL_MEDICINES: Medicine[] = [
  { id: 'med-1', tenantId: 'sp', name: 'Aricept (Donepezila)', dosage: '10mg', manufacturer: 'Pfizer', expiryDate: getRelativeDate(120), quantity: 45, minQuantity: 10 },
  { id: 'med-2', tenantId: 'sp', name: 'Losartana Potássica', dosage: '50mg', manufacturer: 'Medley', expiryDate: getRelativeDate(240), quantity: 90, minQuantity: 20 },
  { id: 'med-3', tenantId: 'sp', name: 'Clexane (Enoxaparina)', dosage: '40mg SC', manufacturer: 'Sanofi', expiryDate: getRelativeDate(14), quantity: 3, minQuantity: 5 },
  { id: 'med-4', tenantId: 'sp', name: 'Fenobarbital', dosage: '100mg', manufacturer: 'Cristália', expiryDate: getRelativeDate(8), quantity: 30, minQuantity: 5 },
];

const INITIAL_SURVEYS: SurveyResponse[] = [
  { id: 'srv-1', tenantId: 'sp', visitId: 'v-1', patientId: 'pat-1', professionalId: 'prof-1', rating: 5, comment: 'Dra. Mariana é excelente.', date: getRelativeDate(-2), channel: 'whatsapp', sentAt: new Date(Date.now() - 172800000).toISOString(), respondedAt: new Date(Date.now() - 172000000).toISOString() },
  { id: 'srv-2', tenantId: 'sp', visitId: 'v-2', patientId: 'pat-2', professionalId: 'prof-2', rating: 4, comment: 'Ótimo atendimento do Carlos.', date: getRelativeDate(-1), channel: 'sms', sentAt: new Date(Date.now() - 86400000).toISOString(), respondedAt: new Date(Date.now() - 85000000).toISOString() },
];

const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  channel: 'whatsapp',
  autoSend: true,
  messageTemplate: 'Olá! Gostaríamos de saber como foi o atendimento de hoje com o(a) profissional {professional_name}. Por favor, avalie em uma escala de 1 a 5 estrelas clicando no link: {survey_link}',
};

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  maxDaysWithoutVisit: 7,
  expiryWarningDays: 30,
  lowStockThreshold: 5,
  enableSystemNotifications: true,
};

// ── Auth listener (registered unconditionally so a fresh login transitions to the app) ──
let authListenerRegistered = false;

function registerAuthListener() {
  if (authListenerRegistered) return;
  authListenerRegistered = true;
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      void useHomeCareStore.getState().init();
      return;
    }
    if (event === 'SIGNED_OUT' || !session) {
      useHomeCareStore.setState({ user: null, profile: null, isAuthenticated: false });
    }
  });
}

// ── Store ───────────────────────────────────────────────────────

export const useHomeCareStore = create<HomeCareState>((set, get) => ({
  // Auth
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  initError: null,

  // Data
  tenants: INITIAL_TENANTS,
  activeTenantId: loadFromStorage('activeTenantId', 'sp'),
  patients: loadFromStorage('patients', INITIAL_PATIENTS),
  professionals: loadFromStorage('professionals', INITIAL_PROFESSIONALS),
  insurances: loadFromStorage('insurances', INITIAL_INSURANCES),
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

  // RBAC
  currentUserRole: loadFromStorage('currentUserRole', 'admin'),
  setCurrentUserRole: (role) => {
    set({ currentUserRole: role });
    saveToStorage('currentUserRole', role);
  },

  // ── Auth ────────────────────────────────────────────────────

  init: async () => {
    if (!isSupabaseConfigured) {
      if (isDemoModeEnabled()) {
        // Demo mode: no Supabase, load from localStorage
        set({ isLoading: false, isAuthenticated: true, user: null, profile: null });
      } else {
        set({
          isLoading: false,
          isAuthenticated: false,
          initError: 'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        });
      }
      return;
    }

    registerAuthListener();

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.user) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const user = session.user;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      const tenantId = profile.tenant_id;

      // Load all tenant data from Supabase
      const [patientsRes, profsRes, visitsRes, leadsRes, msgsRes, medsRes, surveysRes, surveyCfgRes, alertCfgRes] = await Promise.all([
        supabase.from('patients').select('*'),
        supabase.from('professionals').select('*'),
        supabase.from('visits').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('messages').select('*'),
        supabase.from('medicines').select('*'),
        supabase.from('surveys').select('*'),
        supabase.from('survey_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('alert_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
      ]);

      const patients = (patientsRes.data ?? []).map(patientFromRow);
      const professionals = (profsRes.data ?? []).map(professionalFromRow);
      const visits = (visitsRes.data ?? []).map(visitFromRow);
      const leads = (leadsRes.data ?? []).map(leadFromRow);
      const messages = (msgsRes.data ?? []).map(messageFromRow);
      const medicines = (medsRes.data ?? []).map(medicineFromRow);
      const surveys = (surveysRes.data ?? []).map(surveyFromRow);

      const surveyConfig: SurveyConfig = surveyCfgRes.data
        ? { channel: surveyCfgRes.data.channel, autoSend: surveyCfgRes.data.auto_send, messageTemplate: surveyCfgRes.data.message_template }
        : DEFAULT_SURVEY_CONFIG;

      const alertConfig: AlertConfig = alertCfgRes.data
        ? {
            maxDaysWithoutVisit: alertCfgRes.data.max_days_without_visit,
            expiryWarningDays: alertCfgRes.data.expiry_warning_days,
            lowStockThreshold: alertCfgRes.data.low_stock_threshold,
            enableSystemNotifications: alertCfgRes.data.enable_system_notifications,
          }
        : DEFAULT_ALERT_CONFIG;

      // Persist to localStorage as cache
      saveToStorage('patients', patients);
      saveToStorage('professionals', professionals);
      saveToStorage('visits', visits);
      saveToStorage('leads', leads);
      saveToStorage('messages', messages);
      saveToStorage('medicines', medicines);
      saveToStorage('surveys', surveys);
      saveToStorage('surveyConfig', surveyConfig);
      saveToStorage('alertConfig', alertConfig);
      saveToStorage('activeTenantId', tenantId);

      set({
        user,
        profile,
        currentUserRole: profile.role as any,
        isAuthenticated: true,
        isLoading: false,
        activeTenantId: tenantId,
        patients,
        professionals,
        visits,
        leads,
        messages,
        medicines,
        surveys,
        surveyConfig,
        alertConfig,
      });
    } catch (err) {
      console.error('[Store] init failed', err);
      set({ isLoading: false, isAuthenticated: false, user: null, profile: null, initError: (err as Error).message });
    }
  },

  signOut: async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ user: null, profile: null, isAuthenticated: false });
  },

  setActiveTenant: (id) => {
    set({ activeTenantId: id });
    saveToStorage('activeTenantId', id);
  },

  addTenant: (tenant) => {
    const newTenant: Tenant = {
      ...tenant,
      id: tenant.id || `tenant-${Date.now()}`,
    };
    const updated = [...get().tenants, newTenant];
    set({ tenants: updated });
    saveToStorage('tenants', updated);
    upsertRow('tenants', {
      id: newTenant.id,
      name: newTenant.name,
      logo: newTenant.logo,
      cnpj: newTenant.cnpj,
      plan: newTenant.plan,
      parent_id: newTenant.parentId || null,
      status: newTenant.status || 'active',
      custom_domain: newTenant.customDomain || null,
      primary_color: newTenant.primaryColor || null,
      secondary_color: newTenant.secondaryColor || null,
    });
  },

  updateTenant: (id, updates) => {
    const current = get().tenants;
    const next = current.map(t => t.id === id ? { ...t, ...updates } : t);
    set({ tenants: next });
    
    // update backend
    const updated = next.find(t => t.id === id);
    if (updated) {
      upsertRow('tenants', {
        id: updated.id,
        name: updated.name,
        logo: updated.logo,
        cnpj: updated.cnpj,
        plan: updated.plan,
        parent_id: updated.parentId || null,
        status: updated.status || 'active',
        custom_domain: updated.customDomain || null,
        primary_color: updated.primaryColor || null,
        secondary_color: updated.secondaryColor || null
      });
    }
  },

  setOfflineMode: (offline) => {
    const previous = get().isOffline;
    if (previous === offline) return;
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const newLogs = [...get().offlineLogs];
    if (offline) {
      newLogs.push(`[${timestamp}] [SISTEMA] ⚠️ Modo Offline Ativado.`);
      set({ isOffline: true, offlineLogs: newLogs });
    } else {
      newLogs.push(`[${timestamp}] [SISTEMA] 🌐 Conexão Reestabelecida!`);
      set({ isOffline: false, offlineLogs: newLogs });
      get().syncOfflineData();
    }
    saveToStorage('isOffline', offline);
    saveToStorage('offlineLogs', newLogs);
  },

  syncOfflineData: async () => {
    const queue = get().offlineSyncQueue;
    if (queue.length === 0) {
      const logs = [...get().offlineLogs, `[${new Date().toLocaleTimeString('pt-BR')}] [SYNC] Nenhum dado offline pendente.`];
      set({ offlineLogs: logs });
      saveToStorage('offlineLogs', logs);
      return;
    }

    const logs = [...get().offlineLogs, `[${new Date().toLocaleTimeString('pt-BR')}] [SYNC] 🔄 Sincronizando ${queue.length} ações...`];
    set({ offlineLogs: logs });

    for (const item of queue) {
      if (item.type === 'checkIn') {
        const visit = get().visits.find((v) => v.id === item.visitId);
        if (visit) await upsertRow('visits', visitToRow(visit));
      } else if (item.type === 'checkOut') {
        const visit = get().visits.find((v) => v.id === item.visitId);
        if (visit) await upsertRow('visits', visitToRow(visit));
      }
    }

    set({ offlineSyncQueue: [] });
    saveToStorage('offlineSyncQueue', []);
  },

  clearOfflineQueue: () => {
    set({ offlineSyncQueue: [] });
    saveToStorage('offlineSyncQueue', []);
  },

  // ── Patients ────────────────────────────────────────────────

  addPatient: (patient) => {
    const newPatient: Patient = {
      ...patient,
      id: `pat-${Date.now()}`,
      tenantId: get().activeTenantId,
      files: [],
      timeline: [{ id: `t-${Date.now()}`, date: getRelativeDate(0), title: 'Paciente Cadastrado', description: 'Prontuário domiciliar criado no sistema.', type: 'system', author: 'Sistema' }],
    };
    const updated = [...get().patients, newPatient];
    set({ patients: updated });
    saveToStorage('patients', updated);
    upsertRow('patients', patientToRow(newPatient));
  },

  updatePatient: (id, data) => {
    const updated = get().patients.map((p) => (p.id === id ? { ...p, ...data } : p));
    set({ patients: updated });
    saveToStorage('patients', updated);
    const row = updated.find((p) => p.id === id);
    if (row) upsertRow('patients', patientToRow(row));
  },

  deletePatient: (id) => {
    const updated = get().patients.filter((p) => p.id !== id);
    set({ patients: updated });
    saveToStorage('patients', updated);
    deleteRow('patients', id);
  },

  addPatientFile: (patientId, name, size, type) => {
    const newFile = { id: `file-${Date.now()}`, name, size, uploadedAt: getRelativeDate(0), type };
    const updatedPatients = get().patients.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          files: [...p.files, newFile],
          timeline: [...p.timeline, { id: `t-${Date.now()}`, date: getRelativeDate(0), title: 'Arquivo anexado', description: `O arquivo ${name} foi anexado ao prontuário.`, type: 'system' as const, author: 'Operador' }],
        };
      }
      return p;
    });
    set({ patients: updatedPatients });
    saveToStorage('patients', updatedPatients);
    const row = updatedPatients.find((p) => p.id === patientId);
    if (row) upsertRow('patients', patientToRow(row));
  },

  addTimelineEvent: (patientId, event) => {
    const newEvent = { id: `t-${Date.now()}`, date: getRelativeDate(0), ...event };
    const updatedPatients = get().patients.map((p) => (p.id === patientId ? { ...p, timeline: [...p.timeline, newEvent] } : p));
    set({ patients: updatedPatients });
    saveToStorage('patients', updatedPatients);
    const row = updatedPatients.find((p) => p.id === patientId);
    if (row) upsertRow('patients', patientToRow(row));
  },

  consumePatientInventory: (patientId, medicineId, qty) => {
    const updatedPatients = get().patients.map((p) => {
      if (p.id === patientId && p.inventory) {
        const newInventory = p.inventory.map(item => {
          if (item.medicineId === medicineId) {
            return { ...item, quantity: Math.max(0, item.quantity - qty) };
          }
          return item;
        });
        return { ...p, inventory: newInventory };
      }
      return p;
    });
    set({ patients: updatedPatients });
    saveToStorage('patients', updatedPatients);
    const row = updatedPatients.find((p) => p.id === patientId);
    if (row) upsertRow('patients', patientToRow(row));
  },

  // ── Professionals ───────────────────────────────────────────

  addProfessional: (professional) => {
    const newProf: Professional = { ...professional, id: `prof-${Date.now()}`, tenantId: get().activeTenantId, rating: 5.0, documents: professional.documents || [] };
    const updated = [...get().professionals, newProf];
    set({ professionals: updated });
    saveToStorage('professionals', updated);
    upsertRow('professionals', professionalToRow(newProf));
  },

  updateProfessional: (id, data) => {
    const updated = get().professionals.map((p) => (p.id === id ? { ...p, ...data } : p));
    set({ professionals: updated });
    saveToStorage('professionals', updated);
    const row = updated.find((p) => p.id === id);
    if (row) upsertRow('professionals', professionalToRow(row));
  },

  deleteProfessional: (id) => {
    const updated = get().professionals.filter((p) => p.id !== id);
    set({ professionals: updated });
    saveToStorage('professionals', updated);
    deleteRow('professionals', id);
  },

  // ── Insurances ──────────────────────────────────────────────

  addInsurance: (insurance) => {
    const newIns: HealthInsurance = { ...insurance, id: `ins-${Date.now()}`, tenantId: get().activeTenantId };
    const updated = [...get().insurances, newIns];
    set({ insurances: updated });
    saveToStorage('insurances', updated);
    // upsertRow('insurances', insuranceToRow(newIns));
  },

  updateInsurance: (id, data) => {
    const updated = get().insurances.map((i) => (i.id === id ? { ...i, ...data } : i));
    set({ insurances: updated });
    saveToStorage('insurances', updated);
    // const row = updated.find((i) => i.id === id);
    // if (row) upsertRow('insurances', insuranceToRow(row));
  },

  deleteInsurance: (id) => {
    const updated = get().insurances.filter((i) => i.id !== id);
    set({ insurances: updated });
    saveToStorage('insurances', updated);
    // deleteRow('insurances', id);
  },

  // ── Visits ──────────────────────────────────────────────────

  addVisit: (visit) => {
    const newVisit: Visit = { ...visit, id: `v-${Date.now()}`, tenantId: get().activeTenantId };
    const updated = [...get().visits, newVisit];
    set({ visits: updated });
    saveToStorage('visits', updated);
    upsertRow('visits', visitToRow(newVisit));
    get().addTimelineEvent(visit.patientId, { title: 'Visita Agendada', description: `Agendada visita técnica para ${visit.date} das ${visit.timeStart} às ${visit.timeEnd}.`, type: 'visit', author: 'Sistema' });
  },

  updateVisit: (id, data) => {
    const updated = get().visits.map((v) => (v.id === id ? { ...v, ...data } : v));
    set({ visits: updated });
    saveToStorage('visits', updated);
    const row = updated.find((v) => v.id === id);
    if (row) upsertRow('visits', visitToRow(row));
  },

  deleteVisit: (id) => {
    const updated = get().visits.filter((v) => v.id !== id);
    set({ visits: updated });
    saveToStorage('visits', updated);
    deleteRow('visits', id);
  },

  checkInVisit: (id, location, coords) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map((v) => (v.id === id ? { ...v, status: 'em_andamento' as VisitStatus, checkInTime: timeString, checkInLocation: location, checkInCoords: coords } : v));
    set({ visits: updated });
    saveToStorage('visits', updated);
    const row = updated.find((v) => v.id === id);
    if (row) upsertRow('visits', visitToRow(row));

    const visit = get().visits.find((v) => v.id === id);
    if (visit) {
      const prof = get().professionals.find((p) => p.id === visit.professionalId);
      const isOff = get().isOffline;
      get().addTimelineEvent(visit.patientId, {
        title: 'Check-in Realizado' + (isOff ? ' (Offline)' : ''),
        description: `Profissional ${prof?.name || 'técnico'} iniciou o atendimento às ${timeString}.` + (isOff ? ' [Aguardando sincronização]' : ''),
        type: 'visit',
        author: prof?.name || 'Sistema',
      });
    }

    if (get().isOffline) {
      const newItem: OfflineSyncItem = { id: `sync-${Date.now()}`, type: 'checkIn', visitId: id, timestamp: new Date().toISOString(), synced: false, payload: { location } };
      const updatedQueue = [...get().offlineSyncQueue, newItem];
      set({ offlineSyncQueue: updatedQueue });
      saveToStorage('offlineSyncQueue', updatedQueue);
    }
  },

  checkOutVisit: (id, location, report, vitals, rawNotes, usedMeds, coords) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map((v) => (v.id === id ? { ...v, status: 'concluida' as VisitStatus, checkOutTime: timeString, checkOutLocation: location, checkOutCoords: coords, report } : v));
    set({ visits: updated });
    saveToStorage('visits', updated);
    const row = updated.find((v) => v.id === id);
    if (row) upsertRow('visits', visitToRow(row));

    const visit = get().visits.find((v) => v.id === id);
    if (visit) {
      const prof = get().professionals.find((p) => p.id === visit.professionalId);
      const isOff = get().isOffline;
      get().addTimelineEvent(visit.patientId, {
        title: 'Atendimento Concluído' + (isOff ? ' (Offline)' : ''),
        description: `Profissional ${prof?.name || 'técnico'} finalizou a visita às ${timeString}.` + (isOff ? ' [Aguardando sincronização]' : ''),
        type: 'clinical',
        author: prof?.name || 'Sistema',
      });

      if (!isOff) {
        const config = get().surveyConfig;
        if (config?.autoSend) {
          const surveyId = `srv-${Date.now()}`;
          const newSurvey: SurveyResponse = { id: surveyId, tenantId: get().activeTenantId, visitId: visit.id, patientId: visit.patientId, professionalId: visit.professionalId, rating: 0, date: getRelativeDate(0), channel: config.channel, sentAt: new Date().toISOString() };
          const updatedSurveys = [...get().surveys, newSurvey];
          set({ surveys: updatedSurveys });
          saveToStorage('surveys', updatedSurveys);
          upsertRow('surveys', surveyToRow(newSurvey));
          const messageText = config.messageTemplate.replace('{professional_name}', prof?.name || 'técnico').replace('{survey_link}', `https://homecare.pro/survey/${surveyId}`);
          get().sendMessage(visit.patientId, messageText, 'system');
        }
      }
    }

    if (get().isOffline) {
      const newItem: OfflineSyncItem = { id: `sync-${Date.now()}`, type: 'checkOut', visitId: id, timestamp: new Date().toISOString(), synced: false, payload: { location, report, vitals, rawNotes, usedMeds } };
      const updatedQueue = [...get().offlineSyncQueue, newItem];
      set({ offlineSyncQueue: updatedQueue });
      saveToStorage('offlineSyncQueue', updatedQueue);
    }
  },

  // ── CRM ─────────────────────────────────────────────────────

  addLead: (lead) => {
    const newLead: CRMLead = { ...lead, id: `lead-${Date.now()}`, tenantId: get().activeTenantId, createdAt: getRelativeDate(0) };
    const updated = [...get().leads, newLead];
    set({ leads: updated });
    saveToStorage('leads', updated);
    upsertRow('leads', leadToRow(newLead));
  },

  updateLead: (id, data) => {
    const updated = get().leads.map((l) => (l.id === id ? { ...l, ...data } : l));
    set({ leads: updated });
    saveToStorage('leads', updated);
    const row = updated.find((l) => l.id === id);
    if (row) upsertRow('leads', leadToRow(row));
  },

  deleteLead: (id) => {
    const updated = get().leads.filter((l) => l.id !== id);
    set({ leads: updated });
    saveToStorage('leads', updated);
    deleteRow('leads', id);
  },

  // ── Messages ────────────────────────────────────────────────

  sendMessage: (patientId, text, sender) => {
    const newMessage: Message = { id: `msg-${Date.now()}`, tenantId: get().activeTenantId, patientId, sender, text, timestamp: new Date().toISOString(), read: true };
    const updated = [...get().messages, newMessage];
    set({ messages: updated });
    saveToStorage('messages', updated);
    upsertRow('messages', messageToRow(newMessage));
  },

  receiveMessage: (patientId, text) => {
    const newMessage: Message = { id: `msg-${Date.now()}`, tenantId: get().activeTenantId, patientId, sender: 'patient', text, timestamp: new Date().toISOString(), read: false };
    const updated = [...get().messages, newMessage];
    set({ messages: updated });
    saveToStorage('messages', updated);
    upsertRow('messages', messageToRow(newMessage));
  },

  markMessagesRead: (patientId) => {
    const updated = get().messages.map((m) => (m.patientId === patientId ? { ...m, read: true } : m));
    set({ messages: updated });
    saveToStorage('messages', updated);
    // Batch update in Supabase
    if (isSupabaseConfigured) {
      updated.filter((m) => m.patientId === patientId).forEach((m) => upsertRow('messages', messageToRow(m)));
    }
  },

  // ── Medicines ───────────────────────────────────────────────

  addMedicine: (medicine) => {
    const newMed: Medicine = { ...medicine, id: `med-${Date.now()}`, tenantId: get().activeTenantId };
    const updated = [...get().medicines, newMed];
    set({ medicines: updated });
    saveToStorage('medicines', updated);
    upsertRow('medicines', medicineToRow(newMed));
  },

  updateMedicine: (id, data) => {
    const updated = get().medicines.map((m) => (m.id === id ? { ...m, ...data } : m));
    set({ medicines: updated });
    saveToStorage('medicines', updated);
    const row = updated.find((m) => m.id === id);
    if (row) upsertRow('medicines', medicineToRow(row));
  },

  deleteMedicine: (id) => {
    const updated = get().medicines.filter((m) => m.id !== id);
    set({ medicines: updated });
    saveToStorage('medicines', updated);
    deleteRow('medicines', id);
  },

  consumeMedicine: (id, qty) => {
    let success = false;
    const updated = get().medicines.map((m) => {
      if (m.id === id && m.quantity >= qty) {
        success = true;
        return { ...m, quantity: m.quantity - qty };
      }
      return m;
    });
    if (success) {
      set({ medicines: updated });
      saveToStorage('medicines', updated);
      const row = updated.find((m) => m.id === id);
      if (row) upsertRow('medicines', medicineToRow(row));
    }
    return success;
  },

  // ── Surveys ─────────────────────────────────────────────────

  updateSurveyConfig: (config) => {
    const updated = { ...get().surveyConfig, ...config };
    set({ surveyConfig: updated });
    saveToStorage('surveyConfig', updated);
    if (isSupabaseConfigured) {
      upsertRow('survey_config', { id: 'default', tenant_id: get().activeTenantId, channel: updated.channel, auto_send: updated.autoSend, message_template: updated.messageTemplate });
    }
  },

  addSurveyResponse: (survey) => {
    const newSurvey: SurveyResponse = { ...survey, id: `srv-${Date.now()}`, tenantId: get().activeTenantId };
    const updated = [...get().surveys, newSurvey];
    set({ surveys: updated });
    saveToStorage('surveys', updated);
    upsertRow('surveys', surveyToRow(newSurvey));
  },

  respondToSurvey: (id, rating, comment) => {
    const updated = get().surveys.map((s) => (s.id === id ? { ...s, rating, comment, respondedAt: new Date().toISOString() } : s));
    set({ surveys: updated });
    saveToStorage('surveys', updated);
    const row = updated.find((s) => s.id === id);
    if (row) upsertRow('surveys', surveyToRow(row));
  },

  // ── Alerts ──────────────────────────────────────────────────

  updateAlertConfig: (config) => {
    const updated = { ...get().alertConfig, ...config };
    set({ alertConfig: updated });
    saveToStorage('alertConfig', updated);
    if (isSupabaseConfigured) {
      upsertRow('alert_config', {
        id: 'default',
        tenant_id: get().activeTenantId,
        max_days_without_visit: updated.maxDaysWithoutVisit,
        expiry_warning_days: updated.expiryWarningDays,
        low_stock_threshold: updated.lowStockThreshold,
        enable_system_notifications: updated.enableSystemNotifications,
      });
    }
  },

  getCalculatedAlerts: () => {
    const activeTenantId = get().activeTenantId;
    const config = get().alertConfig || { maxDaysWithoutVisit: 7, expiryWarningDays: 30, lowStockThreshold: 5 };
    const today = new Date();
    const alerts: ClinicalAlert[] = [];

    const tenantPatients = get().patients.filter((p) => p.tenantId === activeTenantId && p.status === 'active');
    const tenantVisits = get().visits.filter((v) => v.tenantId === activeTenantId && v.status === 'concluida');

    tenantPatients.forEach((p) => {
      const patientVisits = tenantVisits.filter((v) => v.patientId === p.id);
      if (patientVisits.length === 0) {
        alerts.push({ id: `alert-novisit-${p.id}`, patientId: p.id, type: 'no_visit', severity: 'critical', title: 'Paciente Sem Visita Recente', description: `${p.name} não possui nenhuma visita finalizada.`, date: getRelativeDate(0) });
      } else {
        const sorted = [...patientVisits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const diffDays = Math.floor(Math.abs(today.getTime() - new Date(sorted[0].date).getTime()) / 86400000);
        if (diffDays > config.maxDaysWithoutVisit) {
          alerts.push({ id: `alert-novisit-${p.id}`, patientId: p.id, type: 'no_visit', severity: diffDays > config.maxDaysWithoutVisit * 2 ? 'critical' : 'warning', title: 'Paciente Sem Visita Recente', description: `${p.name} está sem visitas há ${diffDays} dias.`, date: getRelativeDate(0) });
        }
      }
    });

    const tenantMedicines = get().medicines.filter((m) => m.tenantId === activeTenantId);
    tenantMedicines.forEach((m) => {
      if (m.quantity <= m.minQuantity) {
        alerts.push({ id: `alert-lowstock-${m.id}`, medicineId: m.id, type: 'low_stock', severity: m.quantity === 0 ? 'critical' : 'warning', title: 'Estoque Baixo', description: `${m.name} (${m.dosage}) com apenas ${m.quantity} unidades.`, date: getRelativeDate(0) });
      }
      const diffDays = Math.ceil((new Date(m.expiryDate).getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) {
        alerts.push({ id: `alert-expired-${m.id}`, medicineId: m.id, type: 'expiry', severity: 'critical', title: 'Medicamento Vencido', description: `${m.name} venceu há ${Math.abs(diffDays)} dias.`, date: getRelativeDate(0) });
      } else if (diffDays <= config.expiryWarningDays) {
        alerts.push({ id: `alert-near-expiry-${m.id}`, medicineId: m.id, type: 'expiry', severity: diffDays <= 7 ? 'critical' : 'warning', title: 'Medicamento Próximo ao Vencimento', description: `${m.name} vence em ${diffDays} dias.`, date: getRelativeDate(0) });
      }
    });

    return alerts;
  },

  // ── AI Helpers ──────────────────────────────────────────────

  generateAiSummary: async (patientId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    if (!patient) return 'Paciente não encontrado.';
    try {
      const res = await fetch('/api/gemini/summarize-patient', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient }) });
      const data = await res.json();
      if (data.summary) {
        get().updatePatient(patientId, { summaryAi: data.summary });
        return data.summary;
      }
      return 'Erro ao extrair resumo da IA.';
    } catch {
      return 'Não foi possível conectar ao servidor de IA.';
    }
  },

  generateVisitReportAi: async (visitId, rawNotes, vitals) => {
    const visit = get().visits.find((v) => v.id === visitId);
    if (!visit) return 'Visita não encontrada.';
    const patient = get().patients.find((p) => p.id === visit.patientId);
    const professional = get().professionals.find((p) => p.id === visit.professionalId);
    try {
      const res = await fetch('/api/gemini/generate-visit-report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patientName: patient?.name, professionalName: professional?.name, rawNotes, vitals }) });
      const data = await res.json();
      return data.report || 'Erro ao gerar relatório.';
    } catch {
      return 'Erro de conexão com o servidor de IA.';
    }
  },

  suggestScheduleAi: async () => {
    const tid = get().activeTenantId;
    try {
      const res = await fetch('/api/gemini/suggest-schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visits: get().visits.filter((v) => v.tenantId === tid), professionals: get().professionals.filter((p) => p.tenantId === tid), patients: get().patients.filter((p) => p.tenantId === tid) }) });
      const data = await res.json();
      return data.suggestion || 'Sem sugestões disponíveis.';
    } catch {
      return 'Erro ao contactar servidor de IA.';
    }
  },

  analyzeTriageAi: async (description, patientAge?, mainCondition?) => {
    try {
      const res = await fetch('/api/gemini/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, patientAge, mainCondition }) });
      const data = await res.json();
      if (data.urgency && data.specialty) return data as TriageResult;
      throw new Error(data.error || 'Formato inválido');
    } catch {
      const isCritical = description.toLowerCase().includes('falta de ar') || description.toLowerCase().includes('dispneia');
      return { urgency: isCritical ? 'Crítica' : 'Média', urgencyScore: isCritical ? 9 : 5, specialty: isCritical ? 'Fisioterapeuta' : 'Enfermeiro', responseTime: isCritical ? 'Até 2h' : 'Até 12h', clinicalRationale: 'Triagem offline.', recommendedActions: ['Verificar sinais vitais', 'Contactar enfermagem'] };
    }
  },

  transcribeAudioAi: async (audioData, mimeType?) => {
    try {
      const res = await fetch('/api/gemini/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioData, mimeType }) });
      const data = await res.json();
      if (data.transcription !== undefined) return data.transcription;
      throw new Error(data.error || 'Erro ao transcrever');
    } catch {
      return 'Ditado gravado: Paciente estável. Sem queixas adicionais.';
    }
  },
}));
