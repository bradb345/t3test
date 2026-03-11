import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function newApplicationEmail(
  params: EmailMap["new_application"]
): { subject: string; html: string } {
  const landlordName = escapeHtml(params.landlordName);
  const applicantName = escapeHtml(params.applicantName);
  const applicantEmail = escapeHtml(params.applicantEmail);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
  const dashboardUrl = params.dashboardUrl;

  return {
    subject: `New Tenancy Application for Unit ${params.unitNumber} at ${params.propertyName}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Tenancy Application</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .details { background-color: #f0f0ff; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px; }
      .details p { margin: 5px 0; color: #555; font-size: 14px; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New Tenancy Application</h1>
        <p>${applicantName} has applied for your unit</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${landlordName},</p>
        <p class="message">
          A new tenancy application has been submitted for your property. Please review the application and respond at your earliest convenience.
        </p>
        <div class="details">
          <p><strong>Property:</strong> ${propertyName}</p>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          <p><strong>Applicant:</strong> ${applicantName}</p>
          <p><strong>Email:</strong> ${applicantEmail}</p>
        </div>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">Review Application</a>
        </div>
      </div>
      <div class="footer">
        <p>
          This notification was sent by Rentr.<br />
          <a href="${dashboardUrl}">Manage your properties</a>
        </p>
      </div>
    </div>
  </body>
</html>
`,
  };
}
