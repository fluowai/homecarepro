import { Professional, Patient, Visit, Contract } from '../types';
import { User } from '@supabase/supabase-js';
import { phoneToVirtualEmail, normalizeBrazilPhone } from './formatters';

interface UserProfileLike {
  id?: string;
  email?: string;
  full_name?: string;
  role?: string;
}

export function findCurrentProfessional(
  professionals: Professional[],
  user: User | null,
  profile: UserProfileLike | null
): Professional | undefined {
  if (!user && !profile) return undefined;

  return professionals.find(p => {
    if (user?.id && p.userId === user.id) return true;
    if (profile?.id && p.userId === profile.id) return true;

    // Match by email
    const pEmail = p.email?.trim().toLowerCase();
    const uEmail = user?.email?.trim().toLowerCase();
    const profEmail = profile?.email?.trim().toLowerCase();
    if (pEmail && (pEmail === uEmail || pEmail === profEmail)) return true;

    // Match by virtual email (derived from professional phone)
    if (p.phone) {
      const vEmail = phoneToVirtualEmail(p.phone).toLowerCase();
      if (uEmail && vEmail === uEmail) return true;
      if (profEmail && vEmail === profEmail) return true;
    }

    // Match by normalized phone
    if (p.phone) {
      const pNorm = normalizeBrazilPhone(p.phone);
      const userPhoneNorm = normalizeBrazilPhone(user?.phone || '');
      if (userPhoneNorm && pNorm === userPhoneNorm) return true;
    }

    return false;
  });
}

export function getAssignedPatientIds(
  professional: Professional | undefined | null,
  visits: Visit[] = [],
  contracts: Contract[] = []
): Set<string> {
  const ids = new Set<string>();
  if (!professional) return ids;

  // 1. Direct attended patients registered on the professional
  if (Array.isArray(professional.attendedPatients)) {
    for (const ap of professional.attendedPatients) {
      if (ap && ap.patientId) ids.add(ap.patientId);
    }
  }

  // 2. Visits assigned to this professional
  for (const v of visits) {
    if (v.professionalId === professional.id && v.patientId) {
      ids.add(v.patientId);
    }
  }

  // 3. Contracts with services assigned to this professional
  for (const c of contracts) {
    if (c.patientId && Array.isArray(c.services)) {
      if (c.services.some(s => s.professionalId === professional.id)) {
        ids.add(c.patientId);
      }
    }
  }

  return ids;
}
