import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractSubdomain, buildTenantUrl } from './subdomain';

// Mock window.location for testing
function mockWindowLocation(hostname: string) {
  const original = window.location;
  Object.defineProperty(window, 'location', {
    value: { hostname, protocol: 'https:' },
    writable: true,
    configurable: true,
  });
  return () => {
    Object.defineProperty(window, 'location', {
      value: original,
      writable: true,
      configurable: true,
    });
  };
}

// Mock window.__ENV__ for base domain
function mockEnv(baseDomain: string) {
  (window as any).__ENV__ = { VITE_APP_BASE_DOMAIN: baseDomain };
}

function clearEnv() {
  delete (window as any).__ENV__;
}

describe('extractSubdomain', () => {
  beforeEach(() => {
    mockEnv('homecare.wootech.com.br');
  });
  afterEach(() => {
    clearEnv();
  });

  it('retorna null para o domínio base', () => {
    const restore = mockWindowLocation('homecare.wootech.com.br');
    expect(extractSubdomain()).toBeNull();
    restore();
  });

  it('retorna null para www.domíniodobase', () => {
    const restore = mockWindowLocation('www.homecare.wootech.com.br');
    expect(extractSubdomain()).toBeNull();
    restore();
  });

  it('extrai subdomain simples do domínio base', () => {
    const restore = mockWindowLocation('clinicaabc.homecare.wootech.com.br');
    expect(extractSubdomain()).toBe('clinicaabc');
    restore();
  });

  it('retorna null para dominios aninhados (mais de um label antes do base)', () => {
    const restore = mockWindowLocation('a.b.homecare.wootech.com.br');
    expect(extractSubdomain()).toBeNull();
    restore();
  });

  it('retorna null para www subdomain explicito', () => {
    const restore = mockWindowLocation('www.clinicaabc.homecare.wootech.com.br');
    // www as prefix is treated as the www variant of the subdomain, not extracted
    expect(extractSubdomain()).toBeNull();
    restore();
  });

  it('retorna null para dominios que não terminam com o base domain', () => {
    const restore = mockWindowLocation('outro.com.br');
    expect(extractSubdomain()).toBeNull();
    restore();
  });

  it('aceita subdomain passado explicitamente', () => {
    expect(extractSubdomain('minhaclinica.homecare.wootech.com.br')).toBe('minhaclinica');
  });

  it('aceita subdomain com hífen', () => {
    expect(extractSubdomain('clinica-abc-123.homecare.wootech.com.br')).toBe('clinica-abc-123');
  });

  it('retorna null para hostname vazio ou undefined', () => {
    expect(extractSubdomain('')).toBeNull();
    expect(extractSubdomain(undefined)).toBeNull();
  });

  it('ignora porta no hostname', () => {
    expect(extractSubdomain('clinicaabc.homecare.wootech.com.br:3000')).toBe('clinicaabc');
  });

  it('trabalha com protocolo no hostname', () => {
    expect(extractSubdomain('https://clinicaabc.homecare.wootech.com.br/')).toBe('clinicaabc');
  });
});

describe('buildTenantUrl', () => {
  beforeEach(() => {
    mockEnv('homecare.wootech.com.br');
  });
  afterEach(() => {
    clearEnv();
  });

  it('constrói URL correta para subdomain', () => {
    const restore = mockWindowLocation('homecare.wootech.com.br');
    const url = buildTenantUrl('clinicaabc');
    expect(url).toBe('https://clinicaabc.homecare.wootech.com.br');
    restore();
  });
});
