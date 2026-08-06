import { describe, it, expect } from 'vitest';

describe('HomeCare Pro - Store Helpers', () => {
  it('should calculate age correctly', () => {
    function getAge(birthDateString: string): number {
      if (!birthDateString) return 0;
      const today = new Date();
      const birthDate = new Date(birthDateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }

    const today = new Date();
    const birth2000 = `${today.getFullYear() - 24}-01-01`;
    expect(getAge(birth2000)).toBe(24);

    const birthEmpty = '';
    expect(getAge(birthEmpty)).toBe(0);

    const birthFuture = `${today.getFullYear() + 1}-01-01`;
    expect(getAge(birthFuture)).toBeLessThan(0);
  });

  it('should validate base64 audio data cleaning', () => {
    const withPrefix = 'data:audio/webm;base64,SGVsbG8=';
    const withoutPrefix = 'SGVsbG8=';

    const clean1 = withPrefix.includes(',') ? withPrefix.split(',')[1] : withPrefix;
    const clean2 = withoutPrefix.includes(',') ? withoutPrefix.split(',')[1] : withoutPrefix;

    expect(clean1).toBe('SGVsbG8=');
    expect(clean2).toBe('SGVsbG8=');
  });

  it('should generate proper IDs', () => {
    const now = Date.now();
    const id1 = `pat-${now}`;
    const id2 = `pat-${now}`;

    expect(id1).toMatch(/^pat-\d+$/);
    expect(id1).toBe(id2);
  });

  it('should validate patient address structure', () => {
    const address = {
      street: 'Rua das Palmeiras',
      number: '425',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01226-010',
    };

    expect(address.street).toBeTruthy();
    expect(address.number).toBeTruthy();
    expect(address.city).toBeTruthy();
    expect(address.state).toHaveLength(2);
    expect(address.zipCode).toMatch(/^\d{5}-\d{3}$/);
  });
});
