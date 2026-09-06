import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const ROLE_LABELS: Record<string, string> = {
  'admin': 'Administrador',
  'operator': 'Operador',
  'professional': 'Profissional de Saúde',
  'patient': 'Paciente/Familiar',
  'viewer': 'Visualizador',
  'super_admin': 'Super Administrador',
  'mega_admin': 'Mega Administrador'
};

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const k = key.trim();
    return vars[k] !== undefined ? vars[k] : `{{${key}}}`;
  });
}

interface SendOptions {
  from?: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendOptions) {
  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurada. E-mail não enviado para: ${opts.to.join(', ')}. Assunto: ${opts.subject}`);
    return { success: false as const, error: 'RESEND_API_KEY não configurada' };
  }

  const { data, error } = await resend.emails.send({
    from: opts.from || `HomeCare Pro <${DEFAULT_FROM}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
  });

  if (error) {
    console.error('[MAILER] Erro ao enviar e-mail via Resend:', error);
    return { success: false as const, error: error.message };
  }

  console.log(`[MAILER] E-mail enviado com sucesso para ${opts.to.join(', ')}. ID:`, data?.id);
  return { success: true as const, id: data?.id };
}

export interface BrandSender {
  name: string;
  address: string;
  brandName?: string;
}

// Resolve o remetente de e-mail pela árvore do tenant:
//   clínica -> revenda -> sistema
// Usa as colunas email_from_name/email_from_address quando a revenda
// verificou o domínio no Resend; caso contrário, volta ao remetente global.
export async function resolveBrandSender(
  supabaseAdmin: SupabaseClient,
  tenantId?: string
): Promise<BrandSender> {
  const fallback: BrandSender = {
    name: process.env.RESEND_FROM_NAME || 'HomeCare Pro',
    address: DEFAULT_FROM,
    brandName: process.env.RESEND_FROM_NAME || 'HomeCare Pro',
  };

  if (!tenantId || !resend) return fallback;

  const candidates: Array<{
    email_from_name?: string | null;
    email_from_address?: string | null;
    name?: string | null;
  } | null> = [];

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, parent_id, name, email_from_name, email_from_address')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenant) candidates.push(tenant);

  if (tenant?.parent_id) {
    const { data: parent } = await supabaseAdmin
      .from('tenants')
      .select('name, email_from_name, email_from_address')
      .eq('id', tenant.parent_id)
      .maybeSingle();
    if (parent) candidates.push(parent);
  }

  candidates.push(null); // remetente global do sistema

  for (const c of candidates) {
    if (!c) return fallback;
    const address = (c.email_from_address || '').trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      const brandName = c.email_from_name || c.name || fallback.name;
      return { name: brandName, address, brandName };
    }
  }

  return fallback;
}

export async function sendTemplatedEmail(
  supabaseAdmin: SupabaseClient,
  templateName: string,
  to: string | string[],
  variables: Record<string, string>,
  options?: { tenantId?: string; from?: string }
) {
  let templates = supabaseAdmin
    .from('email_templates')
    .select('*')
    .eq('name', templateName)
    .eq('is_active', true);

  if (options?.tenantId) {
    templates = templates.or(`and(tenant_id.eq.${options.tenantId}),and(type.eq.system,tenant_id.is.null)`);
  } else {
    templates = templates.is('tenant_id', null).eq('type', 'system');
  }

  templates = templates.order('created_at', { ascending: false }).limit(1);

  const { data: tmpl, error: tmplError } = await templates.single();

  if (tmplError || !tmpl) {
    console.warn(`[MAILER] Template "${templateName}" não encontrado. E-mail não enviado.`);
    return { success: false as const, error: `Template "${templateName}" não encontrado` };
  }

  const roleName = variables.role_name ? ROLE_LABELS[variables.role_name] || variables.role_name : '';

  const allVars = { ...variables, role_name: roleName };

  const subject = renderTemplate(tmpl.subject, allVars);
  const html = renderTemplate(tmpl.html_content, allVars);
  const text = tmpl.text_content ? renderTemplate(tmpl.text_content, allVars) : undefined;

  return sendEmail({
    from: options?.from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
}

export async function sendInviteEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
  inviteLink: string,
  role: string,
  inviterName: string = 'Equipe HomeCare Pro',
  options?: { tenantId?: string; brandName?: string }
) {
  const roleName = ROLE_LABELS[role] || 'Usuário';

  const sender = await resolveBrandSender(supabaseAdmin, options?.tenantId);
  const finalInviter = options?.brandName || inviterName || sender.brandName || sender.name;
  const from = `${sender.name} <${sender.address}>`;

  const result = await sendTemplatedEmail(
    supabaseAdmin,
    'invite',
    email,
    {
      inviter_name: finalInviter,
      role_name: roleName,
      invite_link: inviteLink,
    },
    { from },
  );

  if (result.success) return;

  console.warn('[MAILER] Invite template not found or failed. Falling back to default HTML.');

  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurada. E-mail de convite não enviado para: ${email}. Link: ${inviteLink}`);
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: 'Você foi convidado para acessar o HomeCare Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Bem-vindo ao HomeCare Pro!</h2>
          <p style="color: #334155; font-size: 16px;">
            Você foi convidado por <strong>${finalInviter}</strong> para acessar o sistema como <strong>${roleName}</strong>.
          </p>
          <p style="color: #334155; font-size: 16px;">
            Clique no botão abaixo para aceitar o convite e configurar seu acesso inicial:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Aceitar Convite
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
            <a href="${inviteLink}" style="color: #2563eb; word-break: break-all;">${inviteLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            ${finalInviter}<br/>
            Este é um e-mail automático, por favor não responda.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[MAILER] Erro ao enviar e-mail de convite fallback via Resend:', error);
    } else {
      console.log(`[MAILER] E-mail de convite enviado com sucesso para ${email}. ID:`, data?.id);
    }
  } catch (err) {
    console.error('[MAILER] Falha crítica ao disparar e-mail de convite:', err);
  }
}
