import type { EmailMap } from "~/lib/emails";

export function maintenanceUpdateEmail(
  params: EmailMap["maintenance_update"]
): { subject: string; html: string } {
  const { tenantName, title, newStatus, notes, dashboardUrl } = params;

  const statusLabels: Record<string, string> = {
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  const statusLabel = statusLabels[newStatus] ?? newStatus;

  const statusColors: Record<string, string> = {
    in_progress: "#3b82f6",
    completed: "#10b981",
    cancelled: "#6b7280",
  };
  const statusColor = statusColors[newStatus] ?? "#6b7280";

  return {
    subject: `Maintenance Update - ${title}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Maintenance Update</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .status-box { background-color: #f8f9fa; border: 2px solid ${statusColor}; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
      .status-box .label { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
      .status-box .status { font-size: 24px; font-weight: 700; color: ${statusColor}; margin: 0; }
      .notes-box { background-color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
      .notes-box h4 { margin: 0 0 8px; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
      .notes-box p { margin: 0; color: #555; font-size: 14px; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Maintenance Update</h1>
        <p>Your request status has changed</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          Your maintenance request "<strong>${title}</strong>" has been updated.
        </p>
        <div class="status-box">
          <div class="label">New Status</div>
          <p class="status">${statusLabel}</p>
        </div>
        ${notes ? `
        <div class="notes-box">
          <h4>Notes from your landlord</h4>
          <p>${notes}</p>
        </div>
        ` : ''}
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">View Details</a>
        </div>
      </div>
      <div class="footer">
        <p>
          This notification was sent by Rentr.<br />
          <a href="${dashboardUrl}">Manage your rental</a>
        </p>
      </div>
    </div>
  </body>
</html>
`,
  };
}
