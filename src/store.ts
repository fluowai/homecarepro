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
  Assembly,
  AssemblyVote,
  Contract,
  Invoice
} from './types';

// ── AI API helper (authenticated fetch) ─────────────────────────
async function aiFetch(path: string, body: unknown): Promise<Response> {
  if (!isSupabaseConfigured) {
    throw new Error('Servidor de IA não configurado.');
  }
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data.session?.access_token) {
    headers['Authorization'] = `Bearer ${data.session.access_token}`;
  }
  return fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
}

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
    check_in_photo: v.checkInPhoto ?? null,
    check_out_photo: v.checkOutPhoto ?? null,
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
    checkInPhoto: (r.check_in_photo as string) ?? undefined,
    checkOutPhoto: (r.check_out_photo as string) ?? undefined,
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
    is_controlled: m.isControlled ?? false,
    control_class: m.controlClass ?? null,
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
    isControlled: Boolean(r.is_controlled),
    controlClass: (r.control_class as string) || undefined,
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

function insuranceToRow(i: HealthInsurance) {
  return {
    id: i.id,
    tenant_id: i.tenantId,
    name: i.name,
    phone: i.phone ?? '',
    email: i.email ?? '',
    contact_person: i.contactPerson ?? '',
  };
}

function insuranceFromRow(r: Record<string, unknown>): HealthInsurance {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    phone: (r.phone as string) || '',
    email: (r.email as string) || '',
    contactPerson: (r.contact_person as string) || undefined,
  };
}

function assemblyToRow(a: Assembly) {
  return {
    id: a.id,
    tenant_id: a.tenantId,
    title: a.title,
    description: a.description,
    status: a.status,
    date: a.date,
    document_url: a.documentUrl ?? null,
  };
}

function assemblyFromRow(r: Record<string, unknown>): Assembly {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    title: r.title as string,
    description: (r.description as string) || '',
    status: r.status as Assembly['status'],
    date: (r.date as string) || '',
    documentUrl: (r.document_url as string) || undefined,
  };
}

function assemblyVoteToRow(v: AssemblyVote) {
  return {
    id: v.id,
    assembly_id: v.assemblyId,
    professional_id: v.professionalId,
    vote: v.vote,
    timestamp: v.timestamp,
  };
}

function assemblyVoteFromRow(r: Record<string, unknown>): AssemblyVote {
  return {
    id: r.id as string,
    assemblyId: r.assembly_id as string,
    professionalId: r.professional_id as string,
    vote: r.vote as AssemblyVote['vote'],
    timestamp: (r.timestamp as string) || '',
  };
}

function contractToRow(c: Contract) {
  return {
    id: c.id,
    tenant_id: c.tenantId,
    patient_id: c.patientId,
    title: c.title,
    status: c.status,
    pdf_url: c.pdfUrl ?? null,
    signature_id: c.signatureId ?? null,
    start_date: c.startDate ?? null,
    end_date: c.endDate ?? null,
    value: c.value ?? null,
  };
}

function contractFromRow(r: Record<string, unknown>): Contract {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    patientId: r.patient_id as string,
    title: r.title as string,
    status: r.status as Contract['status'],
    pdfUrl: (r.pdf_url as string) || undefined,
    signatureId: (r.signature_id as string) || undefined,
    startDate: (r.start_date as string) || undefined,
    endDate: (r.end_date as string) || undefined,
    value: r.value != null ? Number(r.value) : undefined,
    createdAt: (r.created_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
  };
}

// id is generated by the database (uuid), so inserts must NOT include it.
function invoiceToRow(i: Invoice) {
  return {
    tenant_id: i.tenantId,
    patient_id: i.patientId,
    visit_id: i.visitId ?? null,
    issue_date: i.issueDate || null,
    due_date: i.dueDate || null,
    value: i.value,
    status: i.status,
    nfe_id: i.nfeId ?? null,
    nfe_url: i.nfeUrl ?? null,
    description: i.description ?? null,
  };
}

function invoiceFromRow(r: Record<string, unknown>): Invoice {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    patientId: r.patient_id as string,
    visitId: (r.visit_id as string) || undefined,
    issueDate: (r.issue_date as string) || '',
    dueDate: (r.due_date as string) || '',
    value: Number(r.value ?? 0),
    status: r.status as Invoice['status'],
    nfeUrl: (r.nfe_url as string) || undefined,
    nfeId: (r.nfe_id as string) || undefined,
    description: (r.description as string) || undefined,
    createdAt: (r.created_at as string) || new Date().toISOString(),
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
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
  assemblies: Assembly[];
  assemblyVotes: AssemblyVote[];
  contracts: Contract[];
  invoices: Invoice[];

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
  refreshTenants: () => Promise<void>;
  createTenantWithInvite: (input: { name: string; cnpj?: string; plan?: string; logo?: string; customDomain?: string; primaryColor?: string; secondaryColor?: string; adminEmail: string; parentId?: string; tenantType?: 'homecare' | 'cooperativa' }) => Promise<{ tenant: Tenant; inviteLink: string }>;
  regenerateInvite: (tenantId: string, adminEmail: string) => Promise<string>;

  // Offline/Sync Actions
  setOfflineMode: (offline: boolean) => void;
  syncOfflineData: () => Promise<void>;
  clearOfflineQueue: () => void;

  // Patient Actions
  addPatient: (patient: Omit<Patient, 'id' | 'tenantId'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addPatientFile: (patientId: string, name: string, size: string, type: string, url?: string) => void;
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
  checkInVisit: (id: string, location: string, coords?: {lat: number, lng: number}, photo?: string) => void;
  checkOutVisit: (id: string, location: string, report: string, vitals?: { pa: string; fc: string; temp: string; sat: string }, rawNotes?: string, usedMeds?: { id: string; name: string; qty: number }[], coords?: {lat: number, lng: number}, photo?: string) => void;

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
  resolvedAlertIds: string[];
  updateAlertConfig: (config: Partial<AlertConfig>) => void;
  resolveAlert: (id: string) => void;
  getCalculatedAlerts: () => ClinicalAlert[];

  // AI Helpers
  generateAiSummary: (patientId: string) => Promise<string>;
  generateVisitReportAi: (visitId: string, rawNotes: string, vitals: { pa: string; fc: string; temp: string; sat: string }) => Promise<string>;
  suggestScheduleAi: () => Promise<string>;
  analyzeTriageAi: (description: string, patientAge?: number, mainCondition?: string) => Promise<TriageResult>;
  transcribeAudioAi: (audioData: string, mimeType?: string) => Promise<string>;

  // Cooperativa / Societário
  addAssembly: (assembly: Omit<Assembly, 'id' | 'tenantId'>) => void;
  updateAssembly: (id: string, data: Partial<Assembly>) => void;
  voteAssembly: (assemblyId: string, professionalId: string, vote: 'approve' | 'reject' | 'abstain') => void;
  acceptOpenShift: (visitId: string, professionalId: string) => void;
  requestCoverage: (visitId: string) => void;

  // Contract Actions
  addContract: (contract: Omit<Contract, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => void;
  updateContract: (id: string, data: Partial<Contract>) => void;
  deleteContract: (id: string) => void;

  // Invoice Actions
  addInvoice: (invoice: Omit<Invoice, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Promise<Invoice | null>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────────

const getRelativeDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const STORAGE_TTL_MS = 30 * 60 * 1000;

interface StoredWrapper<T> {
  data: T;
  ts: number;
}

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const raw = sessionStorage.getItem(`homecare_pro_${key}`);
    if (!raw) return defaultValue;
    const { data, ts }: StoredWrapper<T> = JSON.parse(raw);
    if (Date.now() - ts > STORAGE_TTL_MS) {
      sessionStorage.removeItem(`homecare_pro_${key}`);
      return defaultValue;
    }
    return data;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T) => {
  try {
    sessionStorage.setItem(`homecare_pro_${key}`, JSON.stringify({ data: value, ts: Date.now() }));
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

// Migration: clear any legacy localStorage data (LGPD - clinical data must not persist)
if (typeof window !== 'undefined' && !isDemoModeEnabled()) {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('homecare_pro_'));
  keys.forEach((k) => localStorage.removeItem(k));
}

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
  tenants: [],
  activeTenantId: loadFromStorage('activeTenantId', ''),
  patients: loadFromStorage('patients', []),
  professionals: loadFromStorage('professionals', []),
  insurances: loadFromStorage('insurances', []),
  visits: loadFromStorage('visits', []),
  leads: loadFromStorage('leads', []),
  messages: loadFromStorage('messages', []),
  medicines: loadFromStorage('medicines', []),
  surveys: loadFromStorage('surveys', []),
  surveyConfig: loadFromStorage('surveyConfig', DEFAULT_SURVEY_CONFIG),
  alertConfig: loadFromStorage('alertConfig', DEFAULT_ALERT_CONFIG),
  resolvedAlertIds: loadFromStorage('resolvedAlertIds', []),
  isOffline: loadFromStorage('isOffline', false),
  offlineSyncQueue: loadFromStorage('offlineSyncQueue', []),
  offlineLogs: loadFromStorage('offlineLogs', ['[SISTEMA]: Sistema online e conectado com o servidor de IA.']),
  assemblies: loadFromStorage('assemblies', []),
  assemblyVotes: loadFromStorage('assemblyVotes', []),
  contracts: loadFromStorage('contracts', []),
  invoices: loadFromStorage('invoices', []),

  // RBAC
  currentUserRole: 'admin',
  setCurrentUserRole: (role) => {
    set({ currentUserRole: role });
  },

  // ── Auth ────────────────────────────────────────────────────

  init: async () => {
    if (!isSupabaseConfigured) {
      if (isDemoModeEnabled()) {
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
      const [tenantsRes, patientsRes, profsRes, visitsRes, leadsRes, msgsRes, medsRes, surveysRes, surveyCfgRes, alertCfgRes, insurancesRes, assembliesRes, assemblyVotesRes, contractsRes, invoicesRes] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('patients').select('*'),
        supabase.from('professionals').select('*'),
        supabase.from('visits').select('*'),
        supabase.from('leads').select('*'),
        supabase.from('messages').select('*'),
        supabase.from('medicines').select('*'),
        supabase.from('surveys').select('*'),
        supabase.from('survey_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('alert_config').select('*').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('health_insurances').select('*'),
        supabase.from('assemblies').select('*'),
        supabase.from('assembly_votes').select('*'),
        supabase.from('contracts').select('*'),
        supabase.from('invoices').select('*'),
      ]);

      const tenants: Tenant[] = (tenantsRes.data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        logo: (r.logo as string) || '',
        cnpj: (r.cnpj as string) || '',
        plan: (r.plan as string) || 'Free',
        parentId: (r.parent_id as string) || undefined,
        status: (r.status as Tenant['status']) || 'active',
        tenantType: (r.tenant_type as Tenant['tenantType']) || 'homecare',
        customDomain: (r.custom_domain as string) || undefined,
        primaryColor: (r.primary_color as string) || undefined,
        secondaryColor: (r.secondary_color as string) || undefined,
      }));
      saveToStorage('tenants', tenants);

      const patients = (patientsRes.data ?? []).map(patientFromRow);
      const professionals = (profsRes.data ?? []).map(professionalFromRow);
      const visits = (visitsRes.data ?? []).map(visitFromRow);
      const leads = (leadsRes.data ?? []).map(leadFromRow);
      const messages = (msgsRes.data ?? []).map(messageFromRow);
      const medicines = (medsRes.data ?? []).map(medicineFromRow);
      const surveys = (surveysRes.data ?? []).map(surveyFromRow);
      const insurances = (insurancesRes.data ?? []).map(insuranceFromRow);
      const assemblies = (assembliesRes.data ?? []).map(assemblyFromRow);
      const assemblyVotes = (assemblyVotesRes.data ?? []).map(assemblyVoteFromRow);
      const contracts = (contractsRes.data ?? []).map(contractFromRow);
      const invoices = (invoicesRes.data ?? []).map(invoiceFromRow);

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
      saveToStorage('insurances', insurances);
      saveToStorage('assemblies', assemblies);
      saveToStorage('assemblyVotes', assemblyVotes);
      saveToStorage('contracts', contracts);
      saveToStorage('invoices', invoices);
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
        tenants,
        patients,
        professionals,
        visits,
        leads,
        messages,
        medicines,
        surveys,
        insurances,
        assemblies,
        assemblyVotes,
        contracts,
        invoices,
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
      tenant_type: newTenant.tenantType || 'homecare',
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
        tenant_type: updated.tenantType || 'homecare',
        custom_domain: updated.customDomain || null,
        primary_color: updated.primaryColor || null,
        secondary_color: updated.secondaryColor || null
      });
    }
  },

  refreshTenants: async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase.from('tenants').select('*');
      if (error) throw error;
      const tenants: Tenant[] = (data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        logo: (r.logo as string) || '',
        cnpj: (r.cnpj as string) || '',
        plan: (r.plan as string) || 'Free',
        parentId: (r.parent_id as string) || undefined,
        status: (r.status as Tenant['status']) || 'active',
        tenantType: (r.tenant_type as Tenant['tenantType']) || 'homecare',
        customDomain: (r.custom_domain as string) || undefined,
        primaryColor: (r.primary_color as string) || undefined,
        secondaryColor: (r.secondary_color as string) || undefined,
      }));
      set({ tenants });
      saveToStorage('tenants', tenants);
    } catch (err) {
      console.error('[Store] refreshTenants failed', err);
    }
  },

  createTenantWithInvite: async (input) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Falha ao criar instância.');
    }
    const tenant: Tenant = {
      id: result.tenant.id,
      name: result.tenant.name,
      logo: result.tenant.logo || '',
      cnpj: result.tenant.cnpj || '',
      plan: result.tenant.plan || 'Free',
      parentId: result.tenant.parentId || undefined,
      status: result.tenant.status || 'active',
      tenantType: result.tenant.tenantType || 'homecare',
      customDomain: result.tenant.customDomain || undefined,
      primaryColor: result.tenant.primaryColor || undefined,
      secondaryColor: result.tenant.secondaryColor || undefined,
    };
    const updated = [...get().tenants, tenant];
    set({ tenants: updated });
    saveToStorage('tenants', updated);
    return { tenant, inviteLink: result.inviteLink as string };
  },

  regenerateInvite: async (tenantId, adminEmail) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await fetch(`/api/admin/tenants/${tenantId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ adminEmail }),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Falha ao gerar convite.');
    }
    return result.inviteLink as string;
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

  addPatientFile: (patientId, name, size, type, url) => {
    const newFile = { id: `file-${Date.now()}`, name, size, uploadedAt: getRelativeDate(0), type, url };
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
    upsertRow('health_insurances', insuranceToRow(newIns));
  },

  updateInsurance: (id, data) => {
    const updated = get().insurances.map((i) => (i.id === id ? { ...i, ...data } : i));
    set({ insurances: updated });
    saveToStorage('insurances', updated);
    const row = updated.find((i) => i.id === id);
    if (row) upsertRow('health_insurances', insuranceToRow(row));
  },

  deleteInsurance: (id) => {
    const updated = get().insurances.filter((i) => i.id !== id);
    set({ insurances: updated });
    saveToStorage('insurances', updated);
    deleteRow('health_insurances', id);
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

  checkInVisit: (id, location, coords, photo) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map((v) => (v.id === id ? { ...v, status: 'em_andamento' as VisitStatus, checkInTime: timeString, checkInLocation: location, checkInCoords: coords, checkInPhoto: photo } : v));
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

  checkOutVisit: (id, location, report, vitals, rawNotes, usedMeds, coords, photo) => {
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const updated = get().visits.map((v) => (v.id === id ? { ...v, status: 'concluida' as VisitStatus, checkOutTime: timeString, checkOutLocation: location, checkOutCoords: coords, checkOutPhoto: photo, report } : v));
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

  resolveAlert: (id) => {
    const next = [...get().resolvedAlertIds, id];
    set({ resolvedAlertIds: next });
    saveToStorage('resolvedAlertIds', next);
  },

  getCalculatedAlerts: () => {
    const activeTenantId = get().activeTenantId;
    const config = get().alertConfig || { maxDaysWithoutVisit: 7, expiryWarningDays: 30, lowStockThreshold: 5 };
    const resolved = new Set(get().resolvedAlertIds);
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

    return alerts.filter((a) => !resolved.has(a.id));
  },

  // ── AI Helpers ──────────────────────────────────────────────

  generateAiSummary: async (patientId) => {
    const patient = get().patients.find((p) => p.id === patientId);
    if (!patient) return 'Paciente não encontrado.';
    try {
      const res = await aiFetch('/api/gemini/summarize-patient', { patient });
      const data = await res.json();
      if (data.summary) {
        get().updatePatient(patientId, { summaryAi: data.summary });
        return data.summary;
      }
      return data.error || 'Erro ao extrair resumo da IA.';
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
      const res = await aiFetch('/api/gemini/generate-visit-report', { patientName: patient?.name, professionalName: professional?.name, rawNotes, vitals });
      const data = await res.json();
      return data.report || data.error || 'Erro ao gerar relatório.';
    } catch {
      return 'Erro de conexão com o servidor de IA.';
    }
  },

  suggestScheduleAi: async () => {
    const tid = get().activeTenantId;
    try {
      const res = await aiFetch('/api/gemini/suggest-schedule', { visits: get().visits.filter((v) => v.tenantId === tid), professionals: get().professionals.filter((p) => p.tenantId === tid), patients: get().patients.filter((p) => p.tenantId === tid) });
      const data = await res.json();
      return data.suggestion || data.error || 'Sem sugestões disponíveis.';
    } catch {
      return 'Erro ao contactar servidor de IA.';
    }
  },

  analyzeTriageAi: async (description, patientAge?, mainCondition?) => {
    try {
      const res = await aiFetch('/api/gemini/triage', { description, patientAge, mainCondition });
      const data = await res.json();
      if (data.urgency && data.specialty) return data as TriageResult;
      throw new Error(data.error || 'Formato inválido');
    } catch {
      const isCritical = description.toLowerCase().includes('falta de ar') || description.toLowerCase().includes('dispneia');
      return { urgency: isCritical ? 'Crítica' : 'Média', urgencyScore: isCritical ? 9 : 5, specialty: isCritical ? 'Fisioterapeuta' : 'Enfermeiro', responseTime: isCritical ? 'Até 2h' : 'Até 12h', clinicalRationale: 'Triagem por regras locais (IA indisponível).', recommendedActions: ['Verificar sinais vitais', 'Contactar enfermagem'] };
    }
  },

  transcribeAudioAi: async (audioData, mimeType?) => {
    try {
      const res = await aiFetch('/api/gemini/transcribe', { audioData, mimeType });
      const data = await res.json();
      if (data.transcription !== undefined) return data.transcription;
      throw new Error(data.error || 'Erro ao transcrever');
    } catch {
      return 'Falha na transcrição. Verifique a conexão com o servidor de IA e tente novamente.';
    }
  },

  // ── Cooperativas & Assemblies ─────────────────────────────────

  addAssembly: (assembly) => {
    const newAss: Assembly = { ...assembly, id: `ass-${Date.now()}`, tenantId: get().activeTenantId };
    const updated = [...get().assemblies, newAss];
    set({ assemblies: updated });
    saveToStorage('assemblies', updated);
    upsertRow('assemblies', assemblyToRow(newAss));
  },

  updateAssembly: (id, data) => {
    const updated = get().assemblies.map(a => a.id === id ? { ...a, ...data } : a);
    set({ assemblies: updated });
    saveToStorage('assemblies', updated);
    const row = updated.find((a) => a.id === id);
    if (row) upsertRow('assemblies', assemblyToRow(row));
  },

  voteAssembly: (assemblyId, professionalId, vote) => {
    // Avoid double voting
    if (get().assemblyVotes.find(v => v.assemblyId === assemblyId && v.professionalId === professionalId)) {
      return;
    }
    const newVote: AssemblyVote = { id: `v-${Date.now()}`, assemblyId, professionalId, vote, timestamp: new Date().toISOString() };
    const updated = [...get().assemblyVotes, newVote];
    set({ assemblyVotes: updated });
    saveToStorage('assemblyVotes', updated);
    upsertRow('assembly_votes', assemblyVoteToRow(newVote));
  },

  acceptOpenShift: (visitId, professionalId) => {
    const updated = get().visits.map(v => {
      if (v.id === visitId) {
        return { ...v, status: 'agendada' as VisitStatus, professionalId, isCoverageRequested: false };
      }
      return v;
    });
    set({ visits: updated });
    saveToStorage('visits', updated);
    const row = updated.find((v) => v.id === visitId);
    if (row) upsertRow('visits', visitToRow(row));
  },

  requestCoverage: (visitId) => {
    const updated = get().visits.map(v => {
      if (v.id === visitId) {
        return { ...v, status: 'open_shift' as VisitStatus, isCoverageRequested: true };
      }
      return v;
    });
    set({ visits: updated });
    saveToStorage('visits', updated);
    const row = updated.find((v) => v.id === visitId);
    if (row) upsertRow('visits', visitToRow(row));
  },

  // ── Contracts ───────────────────────────────────────────────

  addContract: (contract) => {
    const now = new Date().toISOString();
    const newContract: Contract = {
      ...contract,
      id: `cont-${Date.now()}`,
      tenantId: get().activeTenantId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...get().contracts, newContract];
    set({ contracts: updated });
    saveToStorage('contracts', updated);
    upsertRow('contracts', contractToRow(newContract));
  },

  updateContract: (id, data) => {
    const now = new Date().toISOString();
    const updated = get().contracts.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now } : c));
    set({ contracts: updated });
    saveToStorage('contracts', updated);
    const row = updated.find((c) => c.id === id);
    if (row) upsertRow('contracts', contractToRow(row));
  },

  deleteContract: (id) => {
    const updated = get().contracts.filter((c) => c.id !== id);
    set({ contracts: updated });
    saveToStorage('contracts', updated);
    deleteRow('contracts', id);
  },

  // ── Invoice Actions ────────────────────────────────────────────

  addInvoice: async (invoice) => {
    const row = invoiceToRow({ ...invoice, tenantId: get().activeTenantId } as Invoice);
    const { data, error } = await supabase.from('invoices').insert(row).select().single();
    if (error) {
      console.error('[Store] addInvoice failed', error);
      return null;
    }
    const saved = invoiceFromRow(data);
    const updated = [...get().invoices, saved];
    set({ invoices: updated });
    saveToStorage('invoices', updated);
    return saved;
  },

  updateInvoice: async (id, data) => {
    const now = new Date().toISOString();
    const current = get().invoices.find((i) => i.id === id);
    if (!current) return;
    const next: Invoice = { ...current, ...data, updatedAt: now };
    const updated = get().invoices.map((i) => (i.id === id ? next : i));
    set({ invoices: updated });
    saveToStorage('invoices', updated);
    const { error } = await supabase.from('invoices').update(invoiceToRow(next)).eq('id', id);
    if (error) console.error('[Store] updateInvoice failed', error);
  },

  deleteInvoice: async (id) => {
    const updated = get().invoices.filter((i) => i.id !== id);
    set({ invoices: updated });
    saveToStorage('invoices', updated);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) console.error('[Store] deleteInvoice failed', error);
  }
}));
