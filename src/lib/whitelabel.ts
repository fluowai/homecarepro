import { extractSubdomain } from './subdomain';

export async function initWhitelabel() {
  try {
    const domain = window.location.hostname;
    const url = `/api/tenant/resolve?domain=${encodeURIComponent(domain)}`;

    const response = await fetch(url);
    if (!response.ok) return;

    const tenant = await response.json();

    if (tenant) {
      const root = document.documentElement;
      if (tenant.primary_color) {
        root.style.setProperty('--color-green-500', tenant.primary_color);
        root.style.setProperty('--color-green-600', tenant.primary_color);
        root.style.setProperty('--color-green-700', tenant.primary_color);
      }
      if (tenant.secondary_color) {
        root.style.setProperty('--color-indigo-500', tenant.secondary_color);
        root.style.setProperty('--color-indigo-600', tenant.secondary_color);
        root.style.setProperty('--color-indigo-700', tenant.secondary_color);
      }

      (window as any)._tenantBranding = {
        name: tenant.name,
        logo: tenant.logo,
        primaryColor: tenant.primary_color,
        secondaryColor: tenant.secondary_color,
        subdomain: tenant.subdomain,
        customDomain: tenant.custom_domain,
        faviconUrl: tenant.favicon_url,
        pwaIcon192Url: tenant.pwa_icon_192_url,
        pwaIcon512Url: tenant.pwa_icon_512_url,
        pwaShortName: tenant.pwa_short_name,
      };
      document.title = tenant.name || 'HomeCare Pro';

      // Also resolve and expose the subdomain for the store to use
      const subdomain = extractSubdomain(domain);
      if (subdomain) {
        (window as any)._resolvedSubdomain = subdomain;
      }
    }
  } catch (error) {
    console.error("Failed to load whitelabel configuration:", error);
  }
}

export function getResolvedTenantInfo(): { name: string; logo: string; primaryColor?: string; secondaryColor?: string; subdomain?: string; customDomain?: string; faviconUrl?: string; pwaIcon192Url?: string; pwaIcon512Url?: string; pwaShortName?: string } {
  return (window as any)._tenantBranding || { name: 'HomeCare Pro', logo: '', primaryColor: undefined, secondaryColor: undefined, subdomain: undefined, customDomain: undefined };
}
