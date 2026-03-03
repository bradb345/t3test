import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function leaseRenewalAcceptedEmail(
  params: EmailMap["lease_renewal_accepted"]
): { subject: string; html: string } {
  const landlordName = escapeHtml(params.landlordName);
  const tenantName = escapeHtml(params.tenantName);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
  const currency = escapeHtml(params.currency);
  const { dashboardUrl, newLeaseStart, newLeaseEnd } = params;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatMoney = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: params.currency,
    }).format(num);
  };

  const newRentFormatted = formatMoney(params.newRent);

  return {
    subject: `Lease Renewal Accepted - Unit ${unitNumber}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lease Renewal Accepted</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f4f4f7;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .header {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        padding: 40px 30px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .renewal-details {
        background-color: #ecfdf5;
        border-left: 4px solid #059669;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .renewal-details h3 { margin: 0 0 15px; color: #064e3b; font-size: 16px; }
      .detail-row { display: flex; margin: 8px 0; font-size: 14px; }
      .detail-label { color: #065f46; font-weight: 600; min-width: 120px; }
      .detail-value { color: #555; }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        text-align: center;
      }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #059669; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Renewal Accepted</h1>
        <p>Your tenant has accepted the lease renewal</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${landlordName},</p>

        <p class="message">
          Great news! <strong>${tenantName}</strong> has accepted the lease renewal for Unit ${unitNumber} at ${propertyName}. The new lease is now active.
        </p>

        <div class="renewal-details">
          <h3>New Lease Details</h3>
          <div class="detail-row">
            <span class="detail-label">Tenant:</span>
            <span class="detail-value">${tenantName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Unit:</span>
            <span class="detail-value">${unitNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Property:</span>
            <span class="detail-value">${propertyName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lease Start:</span>
            <span class="detail-value">${formatDate(newLeaseStart)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lease End:</span>
            <span class="detail-value">${formatDate(newLeaseEnd)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Monthly Rent:</span>
            <span class="detail-value">${newRentFormatted} ${currency}</span>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            View Tenant
          </a>
        </div>
      </div>

      <div class="footer">
        <p>
          This notification was sent by Rentr.<br />
          <a href="${dashboardUrl}">View your dashboard</a>
        </p>
      </div>
    </div>
  </body>
</html>
`,
  };
}
