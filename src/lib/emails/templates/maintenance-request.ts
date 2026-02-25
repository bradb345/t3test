import type { EmailMap } from "~/lib/emails";

export function maintenanceRequestEmail(
  params: EmailMap["maintenance_request"]
): { subject: string; html: string } {
  const { landlordName, tenantName, title, category, priority, unitNumber, propertyName, dashboardUrl } = params;

  const priorityColors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    emergency: "#dc2626",
  };
  const priorityColor = priorityColors[priority] ?? "#6b7280";

  return {
    subject: `New Maintenance Request - ${title}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Maintenance Request</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .details { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 4px; }
      .details h3 { margin: 0 0 10px; color: #1a1a1a; font-size: 16px; }
      .details p { margin: 5px 0; color: #555; font-size: 14px; }
      .priority-badge { display: inline-block; padding: 4px 12px; background-color: ${priorityColor}; color: #ffffff; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: uppercase; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>New Maintenance Request</h1>
        <p>${tenantName} has submitted a request</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${landlordName},</p>
        <p class="message">
          A new maintenance request has been submitted for your property.
        </p>
        <div class="details">
          <h3>${title}</h3>
          <p><strong>Property:</strong> ${propertyName}</p>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          <p><strong>Category:</strong> ${category}</p>
          <p><strong>Priority:</strong> <span class="priority-badge">${priority}</span></p>
          <p><strong>Submitted by:</strong> ${tenantName}</p>
        </div>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">View Request</a>
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
