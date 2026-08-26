export function getEnv(key: string): string | undefined {
  if (typeof window !== 'undefined' && (window as any).__ENV__ && (window as any).__ENV__[key]) {
    return (window as any).__ENV__[key];
  }
  return import.meta.env[key];
}

export function getAppBaseDomain(): string {
  return getEnv('VITE_APP_BASE_DOMAIN') || 'homecare.wootech.com.br';
}

export function extractSubdomain(hostname?: string): string | null {
  const host = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase().trim();
  if (!host) return null;

  const baseDomain = getAppBaseDomain().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  // Strip protocol, path, and port
  let cleanHost = host.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];

  // Exact match with base domain → no subdomain (it's the main site)
  if (cleanHost === baseDomain || cleanHost === `www.${baseDomain}`) {
    return null;
  }

  // If host ends with base domain, extract the subdomain part
  if (cleanHost.endsWith(`.${baseDomain}`)) {
    const sub = cleanHost.slice(0, -(baseDomain.length + 1));
    // Only return if it's a single label (not nested subdomains)
    if (sub && sub !== 'www' && !sub.includes('.')) {
      return sub;
    }
  }

  // In development, also handle localhost subdomains (e.g., clinicabc.localhost)
  if (import.meta.env.DEV) {
    if (cleanHost.includes('localhost') || cleanHost.includes('127.0.0.1')) {
      const parts = cleanHost.split(':')[0].split('.');
      if (parts.length > 1 && parts[0] && parts[0] !== 'localhost') {
        return parts[0];
      }
    }
  }

  return null;
}

export function buildTenantUrl(subdomain: string): string {
  const base = getAppBaseDomain();
  const proto = (typeof window !== 'undefined' && window.location && window.location.protocol)
    ? window.location.protocol
    : 'https:';
  return `${proto}//${subdomain}.${base}`;
}
