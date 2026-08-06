import { test, expect } from '@playwright/test';

const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e@homecarepro.test';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'E2e!Passw0rd-2026';

test.describe('HomeCare Pro E2E', () => {
  test('smoke público: health, privacy-policy e página de login', async ({ page, request }) => {
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    expect((await health.json()).status).toBe('ok');

    const privacy = await request.get('/api/lgpd/privacy-policy');
    expect(privacy.status()).toBe(200);
    expect((await privacy.json()).company).toBe('HomeCare Pro');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'HomeCare Pro' })).toBeVisible();
    await expect(page.getByText('Entrar na plataforma')).toBeVisible();
  });

  test('login com senha incorreta exibe erro e não autentica', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(E2E_EMAIL);
    await page.locator('input[type="password"]').fill('senha-incorreta-123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Email ou senha incorretos.')).toBeVisible();
  });

  test('login válido acessa o dashboard e navega para Pacientes', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(E2E_EMAIL);
    await page.locator('input[type="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('heading', { name: 'Painel Operacional Geral' })).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Pacientes', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gestão de Pacientes Domiciliares' })).toBeVisible({ timeout: 15_000 });
  });
});
