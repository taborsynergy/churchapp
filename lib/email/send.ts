import 'server-only';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const FROM = 'ChurchConnect <admin@taborsynergy.com>';

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // In dev without a key, log and skip — don't crash
    if (process.env.NODE_ENV !== 'production') {
      console.info('[email] RESEND_API_KEY not set — skipping send to', to, '|', subject);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject,
      html,
      reply_to: replyTo ?? 'admin@taborsynergy.com',
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}
