/**
 * Email Service Abstraction
 *
 * Currently uses console.log to simulate sending emails.
 * To integrate a real provider (e.g., Resend, SendGrid), replace
 * the implementation of sendEmail() in this file.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email (simulated via console.log)
 *
 * Replace this function body with a real email provider when ready.
 */
async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const messageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log('--- SIMULATED EMAIL ---');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log(`Body: ${options.text || options.html}`);
  console.log(`Message ID: ${messageId}`);
  console.log('--- END EMAIL ---');

  return { success: true, messageId };
}

/**
 * Send a group invitation email to a non-user
 */
export async function sendInvitationEmail(params: {
  recipientEmail: string;
  groupName: string;
  inviterName: string;
  token: string;
}): Promise<SendEmailResult> {
  const { recipientEmail, groupName, inviterName, token } = params;

  const subject = `You've been invited to join "${groupName}" on FringeIsland`;

  const html = `
    <h2>You're invited!</h2>
    <p><strong>${inviterName}</strong> has invited you to join <strong>${groupName}</strong> on FringeIsland.</p>
    <p>FringeIsland is a platform for personal development, leadership training, and organizational growth.</p>
    <p>To accept this invitation, create an account at FringeIsland using this email address (${recipientEmail}).</p>
    <p>Your invitation will be waiting for you when you sign up.</p>
    <p><em>This invitation expires in 30 days.</em></p>
  `.trim();

  const text = [
    `You're invited!`,
    ``,
    `${inviterName} has invited you to join "${groupName}" on FringeIsland.`,
    ``,
    `FringeIsland is a platform for personal development, leadership training, and organizational growth.`,
    ``,
    `To accept this invitation, create an account at FringeIsland using this email address (${recipientEmail}).`,
    `Your invitation will be waiting for you when you sign up.`,
    ``,
    `This invitation expires in 30 days.`,
  ].join('\n');

  return sendEmail({
    to: recipientEmail,
    subject,
    html,
    text,
  });
}
