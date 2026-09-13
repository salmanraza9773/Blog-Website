const nodemailer = require('nodemailer');

/**
 * Create SMTP Transporter based on environment variables or fallbacks
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }

  // Fallback: Null transport for development mode when SMTP credentials are not yet set
  return null;
}

/**
 * Send Password Reset Email
 * @param {string} toEmail - Recipient email address
 * @param {string} resetUrl - Full URL to reset password page with token
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || '"KnowledgeShare Support" <noreply@knowledgeshare.com>';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #1e293b; margin-top: 0;">Reset Your KnowledgeShare Password</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        We received a request to reset the password for your KnowledgeShare account (<strong>${toEmail}</strong>).
      </p>
      <p style="color: #475569; font-size: 15px; line-height: 1.6;">
        Click the button below to choose a new password. This link is valid for 1 hour:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        If button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: toEmail,
        subject: 'Reset your KnowledgeShare password',
        html: htmlContent
      });
      console.log(`📧 Reset email sent to ${toEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Failed to send reset email to ${toEmail}:`, err);
    }
  } else {
    console.log(`ℹ️ SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). Password reset link for ${toEmail}: ${resetUrl}`);
  }

  return { success: true, logged: true };
}

module.exports = {
  sendPasswordResetEmail
};
