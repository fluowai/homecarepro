import { describe, expect, it } from 'vitest';
import { normalizeBrazilPhone } from './formatters';

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
