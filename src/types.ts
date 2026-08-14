export type PatientStatus = 'active' | 'inactive';
export type ProfessionalStatus = 'active' | 'busy' | 'offline';
export type VisitStatus = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada' | 'open_shift';
export type LeadStatus = 'lead' | 'avaliacao' | 'proposta' | 'fechado';

export interface Tenant {
  id: string;
  name: string;
  logo: string;
  cnpj: string;
  plan: string;
  parentId?: string;
  status?: 'active' | 'inactive' | 'blocked';
  tenantType?: 'homecare' | 'cooperativa';
  customDomain?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export type UserRole = 'mega_admin' | 'super_admin' | 'admin' | 'operator' | 'professional' | 'patient' | 'viewer';

export interface UserProfile {
  id: string;
  tenantId: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface UserTenant {
  userId: string;
  tenantId: string;
  role: UserRole;
  createdAt: string;
}

export interface HealthInsurance {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  contactPerson?: string;
}

export interface PatientFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: string;
  url?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'clinical' | 'visit' | 'system' | 'billing';
  author: string;
  photos?: string[];
  vitals?: {
    pa?: string;
    fc?: string;
    temp?: string;
    sat?: string;
    pain?: number;
  };
}

export interface Patient {
  id: string;
  tenantId: string;
  name: string;
  birthDate: string;
  cpf: string;
  gender?: 'M' | 'F' | 'O';
  phone: string;
  email: string;
  status: PatientStatus;
  planType: string;
  insuranceId?: string;
  monthlyPackageValue?: number;
  padScope?: string;
  avatar: string;
  diagnostic: string;
  allergies: string[];
  medications: string[];
  files: PatientFile[];
  timeline: TimelineEvent[];
  inventory?: {
    medicineId: string;
    medicineName: string;
    quantity: number;
    dosage: string;
  }[];
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  summaryAi?: string;
}

export type ProfessionalSpecialty = 
  | 'Enfermeiro' 
  | 'Técnico de Enfermagem' 
  | 'Auxiliar de Enfermagem'
  | 'Fisioterapeuta' 
  | 'Fonoaudiólogo' 
  | 'Médico' 
  | 'Nutricionista'
  | 'Psicólogo'
  | 'Terapeuta Ocupacional'
  | 'Assistente Social'
  | 'Cuidador de Idosos';

export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  cpf: string;
  gender: 'M' | 'F' | 'O';
  specialty: ProfessionalSpecialty;
  registration: string; // ex: COREN-SP 123456
  status: ProfessionalStatus;
  email: string;
  phone: string;
  avatar: string;
  rating: number;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zipCode: string;
  };
  documents: {
    type: string;
    name: string;
    url: string;
    expirationDate?: string;
    status?: 'valid' | 'expired' | 'pending';
  }[];
  stampSignatureUrl?: string;
  score?: number;
  tier?: 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';
  balance?: number;
}

export interface Visit {
  id: string;
  tenantId: string;
  patientId: string;
  professionalId: string;
  date: string; // YYYY-MM-DD
  timeStart: string; // HH:MM
  timeEnd: string; // HH:MM
  status: VisitStatus;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInCoords?: { lat: number; lng: number };
  checkOutCoords?: { lat: number; lng: number };
  checkInPhoto?: string;
  checkOutPhoto?: string;
  report?: string;
  value: number;
  baseValue?: number;
  isCoverageRequested?: boolean;
}

export interface CRMLead {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  source: string; // ex: WhatsApp, Google, Indicação
  estimatedValue: number;
  lastInteraction: string;
  notes: string;
  createdAt: string;
}

export interface Message {
  id: string;
  tenantId: string;
  patientId: string;
  sender: 'patient' | 'system' | 'operator';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface Medicine {
  id: string;
  tenantId: string;
  name: string;
  dosage: string;
  manufacturer: string;
  expiryDate: string; // YYYY-MM-DD
  quantity: number;
  minQuantity: number;
  isControlled?: boolean;
  controlClass?: string;
}

export interface MedicationAdministration {
  id: string;
  tenantId: string;
  patientId: string;
  medicineId: string;
  visitId?: string;
  professionalId: string;
  quantity: number;
  administeredAt: string;
  notes: string;
  verifiedByPin: boolean;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  tenantId: string;
  visitId: string;
  patientId: string;
  professionalId: string;
  rating: number; // 1-5
  comment?: string;
  date: string; // YYYY-MM-DD
  channel: 'whatsapp' | 'sms';
  sentAt: string;
  respondedAt?: string;
}

export interface SurveyConfig {
  channel: 'whatsapp' | 'sms';
  autoSend: boolean;
  messageTemplate: string;
}

export interface AlertConfig {
  maxDaysWithoutVisit: number;
  expiryWarningDays: number;
  lowStockThreshold: number;
  enableSystemNotifications: boolean;
}

export interface ClinicalAlert {
  id: string;
  patientId?: string;
  medicineId?: string;
  type: 'no_visit' | 'expiry' | 'low_stock' | 'clinical';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  date: string;
}

export interface OfflineSyncItem {
  id: string;
  type: 'checkIn' | 'checkOut';
  visitId: string;
  timestamp: string;
  synced: boolean;
  payload: {
    location?: string;
    report?: string;
    vitals?: {
      pa: string;
      fc: string;
      temp: string;
      sat: string;
    };
    rawNotes?: string;
    usedMeds?: { id: string; name: string; qty: number }[];
  };
}

export interface TriageResult {
  urgency: 'Crítica' | 'Alta' | 'Média' | 'Baixa';
  urgencyScore: number;
  specialty: ProfessionalSpecialty;
  responseTime: string;
  clinicalRationale: string;
  recommendedActions: string[];
}

export interface SaaSPlan {
  id: string;
  name: string;
  price: number;
  maxPatients: number;
  maxUsers: number;
  features: string[];
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  userId: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  tenantId: string;
  leadId: string;
  title: string;
  value: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contract {
  id: string;
  tenantId: string;
  patientId: string;
  title: string;
  status: 'draft' | 'pending_signature' | 'active' | 'terminated';
  pdfUrl?: string;
  signatureId?: string;
  startDate?: string;
  endDate?: string;
  value?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  patientId: string;
  visitId?: string;
  issueDate: string;
  dueDate: string;
  value: number;
  status: 'PENDING' | 'PAID' | 'CANCELED' | 'FAILED';
  nfeUrl?: string;
  nfeId?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assembly {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed';
  date: string;
  documentUrl?: string;
}

export interface AssemblyVote {
  id: string;
  assemblyId: string;
  professionalId: string;
  vote: 'approve' | 'reject' | 'abstain';
  timestamp: string;
}
