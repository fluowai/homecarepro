import { describe, expect, it } from 'vitest';
import { normalizeBrazilPhone, phoneToVirtualEmail } from './formatters';

describe('normalizeBrazilPhone', () => {
  it('normaliza telefone brasileiro formatado para E.164', () => {
    expect(normalizeBrazilPhone('(11) 99999-9999')).toBe('+5511999999999');
  });

  it('não duplica o código do Brasil', () => {
    expect(normalizeBrazilPhone('+55 (11) 99999-9999')).toBe('+5511999999999');
  });

  it('retorna vazio quando não há número', () => {
    expect(normalizeBrazilPhone('')).toBe('');
  });
});

describe('phoneToVirtualEmail', () => {
  it('gera email sintético correto para telefone formatado', () => {
    expect(phoneToVirtualEmail('(21) 97390-3334')).toBe('tel_5521973903334@homecarepro.internal');
  });

  it('gera email sintético com código 55 quando já presente', () => {
    expect(phoneToVirtualEmail('+5521973903334')).toBe('tel_5521973903334@homecarepro.internal');
  });

  it('retorna vazio se o telefone estiver em branco', () => {
    expect(phoneToVirtualEmail('')).toBe('');
  });
});
