import { Resend } from 'resend';

// Inicializar o Resend apenas se a chave estiver presente
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Remetente configurado no seu domínio Resend (ex: no-reply@homecarepro.com.br)
// Se não tiver um domínio configurado, o Resend usa onboarding@resend.dev apenas para envio ao próprio e-mail da conta Resend.
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

export async function sendInviteEmail(email: string, inviteLink: string, role: string, inviterName: string = 'Equipe HomeCare Pro') {
  if (!resend) {
    console.warn(`[MAILER] RESEND_API_KEY não configurada. E-mail de convite não enviado para: ${email}. Link: ${inviteLink}`);
    return;
  }

  const roleLabels: Record<string, string> = {
    'admin': 'Administrador',
    'operator': 'Operador',
    'professional': 'Profissional de Saúde',
    'patient': 'Paciente/Familiar',
    'viewer': 'Visualizador',
    'super_admin': 'Super Administrador',
    'mega_admin': 'Mega Administrador'
  };

  const roleName = roleLabels[role] || 'Usuário';

  try {
    const { data, error } = await resend.emails.send({
      from: `HomeCare Pro <${DEFAULT_FROM}>`,
      to: [email],
      subject: 'Você foi convidado para acessar o HomeCare Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Bem-vindo ao HomeCare Pro!</h2>
          <p style="color: #334155; font-size: 16px;">
            Você foi convidado por <strong>${inviterName}</strong> para acessar o sistema como <strong>${roleName}</strong>.
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
            Equipe HomeCare Pro<br/>
            Este é um e-mail automático, por favor não responda.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[MAILER] Erro ao enviar e-mail via Resend:', error);
    } else {
      console.log(`[MAILER] E-mail de convite enviado com sucesso para ${email}. ID:`, data?.id);
    }
  } catch (err) {
    console.error('[MAILER] Falha crítica ao disparar e-mail:', err);
  }
}
