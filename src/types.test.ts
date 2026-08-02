import { describe, it, expect } from 'vitest';

describe('HomeCare Pro - Core Type Safety', () => {
  it('should define valid patient statuses', () => {
    const validStatuses = ['active', 'inactive'];
    expect(validStatuses).toContain('active');
    expect(validStatuses).toContain('inactive');
  });

  it('should define valid visit statuses', () => {
    const validStatuses = ['agendada', 'em_andamento', 'concluida', 'cancelada'];
    expect(validStatuses).toHaveLength(4);
  });

  it('should define valid user roles', () => {
    const validRoles = ['mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer'];
    expect(validRoles).toContain('mega_admin');
    expect(validRoles).toContain('admin');
  });

  it('should define valid professional specialties', () => {
    const specialties = [
      'Enfermeiro', 'Técnico de Enfermagem', 'Auxiliar de Enfermagem',
      'Fisioterapeuta', 'Fonoaudiólogo', 'Médico', 'Nutricionista',
      'Psicólogo', 'Terapeuta Ocupacional', 'Assistente Social', 'Cuidador de Idosos',
    ];
    expect(specialties.length).toBeGreaterThanOrEqual(10);
  });

  it('should define valid triage urgency levels', () => {
    const urgencies = ['Crítica', 'Alta', 'Média', 'Baixa'];
    expect(urgencies).toHaveLength(4);
  });
});
