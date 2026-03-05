import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function viewingRequestEmail(
  params: EmailMap["viewing_request"]
): { subject: string; html: string } {
  const {
    landlordName,
    requesterName,
    requesterEmail,
    requesterPhone,
    unitNumber,
    propertyName,
    preferredDate,
    preferredTime,
    message,
    dashboardUrl,
  } = params;

  const scheduleHtml =
    preferredDate || preferredTime
      ? `<div class="info-box">
      <div class="label">Preferred Schedule</div>
      <div>${preferredDate ? escapeHtml(preferredDate) : "No date specified"}${preferredTime ? ` &mdash; ${escapeHtml(preferredTime)}` : ""}</div>
    </div>`
      : "";

  const messageHtml = message
    ? `<div class="info-box">
      <div class="label">Message</div>
      <div>${escapeHtml(message)}</div>
    </div>`
    : "";

  const phoneHtml = requesterPhone
    ? `<div style="color: #6b7280; font-size: 14px;">${escapeHtml(requesterPhone)}</div>`
    : "";

  return {
    subject: `New Viewing Request for Unit ${unitNumber} at ${propertyName}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Viewing Request</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background-color: white; border: 1px solid #e5e7eb; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .label { font-weight: 600; color: #6b7280; font-size: 14px; margin-bottom: 5px; }
    .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Viewing Request</h1>
  </div>
  <div class="content">
    <p>Hello ${escapeHtml(landlordName)},</p>
    <p>Someone has requested to view <strong>Unit ${escapeHtml(unitNumber)}</strong> at <strong>${escapeHtml(propertyName)}</strong>.</p>
    <div class="info-box">
      <div class="label">From</div>
      <div>${escapeHtml(requesterName)}</div>
      <div style="color: #6b7280; font-size: 14px;">${escapeHtml(requesterEmail)}</div>
      ${phoneHtml}
    </div>
    ${scheduleHtml}
    ${messageHtml}
    <a href="${escapeHtml(dashboardUrl)}" class="button">View Request</a>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Rentr. All rights reserved.</p>
  </div>
</body>
</html>
`,
  };
}
