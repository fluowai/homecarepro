export async function initWhitelabel() {
  try {
    const domain = window.location.hostname;
    // Call the resolution endpoint
    const url = `/api/tenant/resolve?domain=${encodeURIComponent(domain)}`;
    
    // In dev mode, we might need absolute URL to backend, but Vite proxies /api
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
      
      // Store globally so AuthView can read the logo
      (window as any)._tenantBranding = {
        name: tenant.name,
        logo: tenant.logo
      };
    }
  } catch (error) {
    console.error("Failed to load whitelabel configuration:", error);
  }
}
