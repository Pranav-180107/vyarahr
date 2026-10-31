import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('📧 SMTP Nodemailer transporter configured with host:', process.env.SMTP_HOST);
} else {
  console.log('📧 SMTP credentials not provided in .env - running mailer in automated log dispatch mode');
}

export async function sendWelcomeEmail({ to, companyName, adminName, slug, password, role = 'Super Admin' }) {
  const loginUrl = `${process.env.APP_BASE_URL || 'http://localhost:5174'}/login?workspace=${slug}`;
  const subject = `Your VyaraHR Workspace is Ready! Welcome to ${companyName}`;

  const textContent = `
Dear ${adminName || 'Applicant'},

Your workspace for ${companyName} has been approved and provisioned!
You have been assigned as the ${role} of your organization.

Here are your login credentials:
============================================================
🏢 Workspace Name : ${companyName}
🔗 Workspace URL  : ${loginUrl}
👤 Login Email    : ${to}
🔑 Password        : ${password}
👑 Your Role      : ${role}
============================================================

Next Steps:
1. Click your Workspace URL above to log in.
2. You can create login credentials (email, password, and roles) for your staff
   under Settings > Admin & Employee Management.

If you have any questions, reply directly to support@vyarahr.com.

Best regards,
The VyaraHR Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your VyaraHR Workspace is Ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #f97316;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
        Vyara<span style="color: #f97316;">HR</span>
      </h1>
      <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 13px;">Enterprise Multi-Tenant HR &amp; Workforce Operating System</p>
    </div>

    <div style="padding: 32px 24px;">
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Your Workspace is Ready!</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Dear <strong>${adminName || 'Applicant'}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Your dedicated workspace for <strong>${companyName}</strong> has been successfully approved and provisioned. You have been assigned as the <strong>${role}</strong> of your organization.
      </p>

      <div style="background: #fff7ed; border: 1px solid #ffedd5; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="margin-top: 0; color: #c2410c; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Official Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; width: 140px;">🏢 <strong>Workspace:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">🔗 <strong>Workspace URL:</strong></td>
            <td style="padding: 6px 0;"><a href="${loginUrl}" style="color: #ea580c; text-decoration: underline; font-weight: 600;">${loginUrl}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">👤 <strong>Login Email:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px;">${to}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">🔑 <strong>Password:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 14px; font-weight: bold; background: #fed7aa; padding: 2px 8px; border-radius: 4px; display: inline-block;">${password}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">👑 <strong>Role:</strong></td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${role}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${loginUrl}" style="background: #ea580c; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);">
          Access Workspace Dashboard &rarr;
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 24px;">
        <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 13px;">Next Steps:</h4>
        <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.6;">
          <li>Click the access link above to sign into your tenant workspace.</li>
          <li>Navigate to <strong>Settings &gt; Admin &amp; Employee Management</strong> to invite your team and create credentials for department heads.</li>
          <li>For security, you may change your master password under profile settings once logged in.</li>
        </ol>
      </div>
    </div>

    <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      VyaraHR Technologies &bull; Native Multi-Tenant SaaS Platform &bull; support@vyarahr.com
    </div>
  </div>
</body>
</html>
  `.trim();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"VyaraHR Cloud" <onboarding@vyarahr.com>',
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log('✅ Welcome email dispatched via SMTP:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('⚠️ SMTP send error:', err.message);
      return { success: false, error: err.message };
    }
  } else {
    console.log(`
============================================================
[SIMULATED DISPATCH] Welcome Email Dispatched:
To: ${to}
Subject: ${subject}
Credentials: Email=${to} | Password=${password} | Slug=${slug}
Login URL: ${loginUrl}
============================================================
    `);
    return { success: true, simulated: true };
  }
}

export async function sendEmailGeneric({ to, subject, html, text }) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"VyaraHR" <notifications@vyarahr.com>',
        to,
        subject,
        text: text || '',
        html: html || '',
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  } else {
    console.log(`[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`);
    return { success: true, simulated: true };
  }
}
