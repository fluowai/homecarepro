import { describe, expect, it } from 'vitest';
import { normalizeBrazilPhone, phoneToVirtualEmail, formatPhoneInput, formatPhoneForDisplay } from './formatters';

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

describe('formatPhoneInput', () => {
  it('remove formatação e limita a 11 dígitos', () => {
    expect(formatPhoneInput('(11) 98888-8888')).toBe('11988888888');
  });

  it('limita a 11 dígitos quando input maior', () => {
    expect(formatPhoneInput('1198888888899')).toBe('11988888888');
  });

  it('retorna vazio para entrada em branco', () => {
    expect(formatPhoneInput('')).toBe('');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formata 11 dígitos como (XX) XXXXX-XXXX', () => {
    expect(formatPhoneForDisplay('11988888888')).toBe('(11) 98888-8888');
  });

  it('formata 10 dígitos como (XX) XXXX-XXXX', () => {
    expect(formatPhoneForDisplay('1198888888')).toBe('(11) 9888-8888');
  });

  it('retorna vazio para entrada em branco', () => {
    expect(formatPhoneForDisplay('')).toBe('');
  });
});
