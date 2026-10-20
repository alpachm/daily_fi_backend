import { Resend } from 'resend';

const DEFAULT_FROM = 'Daily Fi <onboarding@resend.dev>';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional HTML email through Resend.
 *
 * The API key is read lazily from `RESEND_API_KEY` so the server can still boot
 * during development without an email provider configured. It fails with a
 * clear message only when an email is actually attempted (see `agent.md` —
 * "Sin Exposición de Secretos").
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Missing RESEND_API_KEY environment variable. Add it to your `.env` file before sending transactional emails.',
    );
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(`Failed to send email via Resend: ${error.message}`);
  }
}

/**
 * Builds and sends the password-reset email for the given recipient.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<void> {
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="480" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Reset your password</h1>
                <p style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#3f3f46;">
                  We received a request to reset the password for your Daily Fi account.
                  Click the button below to choose a new password. This link expires in 15 minutes.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">Reset password</a>
                </p>
                <p style="margin:0;font-size:12px;color:#71717a;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  await sendEmail({
    to,
    subject: 'Reset your Daily Fi password',
    html,
  });
}
