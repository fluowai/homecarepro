export type EmailPayload = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

export type EmailProvider = {
  sendEmail: (payload: EmailPayload) => Promise<{ success: boolean; error?: string }>;
};

function createResendProvider(apiKey: string): EmailProvider {
  return {
    sendEmail: async ({ to, subject, html, text }) => {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            from: 'HomeCare Pro <no-reply@homecarepro.com.br>',
            to,
            subject,
            html,
            text,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
  };
}

function createNoOpProvider(): EmailProvider {
  return {
    sendEmail: async () => {
      console.warn('[Email] No provider configured. Email not sent.');
      return { success: false, error: 'No email provider configured' };
    },
  };
}

let emailProvider: EmailProvider;

export function initEmailProvider() {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    emailProvider = createResendProvider(apiKey);
    console.log('[Email] Resend provider initialized');
  } else {
    emailProvider = createNoOpProvider();
    console.warn('[Email] No RESEND_API_KEY configured. Emails will be logged only.');
  }
}

export async function sendEmail(payload: EmailPayload) {
  if (!emailProvider) {
    initEmailProvider();
  }
  return emailProvider.sendEmail(payload);
}
