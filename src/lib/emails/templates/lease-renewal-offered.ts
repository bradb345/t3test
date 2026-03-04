import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function leaseRenewalOfferedEmail(
  params: EmailMap["lease_renewal_offered"]
): { subject: string; html: string } {
  const tenantName = escapeHtml(params.tenantName);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
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

  const currentRentFormatted = formatMoney(params.currentRent);
  const newRentFormatted = formatMoney(params.newRent);
  const rentChanged = params.currentRent !== params.newRent;

  return {
    subject: `Lease Renewal Offered for Unit ${unitNumber}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lease Renewal Offered</title>
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
        background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
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
        background-color: #f0fdfa;
        border-left: 4px solid #0d9488;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .renewal-details h3 { margin: 0 0 15px; color: #134e4a; font-size: 16px; }
      .detail-row { display: flex; margin: 8px 0; font-size: 14px; }
      .detail-label { color: #115e59; font-weight: 600; min-width: 120px; }
      .detail-value { color: #555; }
      .rent-change {
        background-color: ${rentChanged ? "#fef3c7" : "#f0fdfa"};
        border: 2px solid ${rentChanged ? "#f59e0b" : "#0d9488"};
        border-radius: 8px;
        padding: 20px;
        margin: 24px 0;
        text-align: center;
      }
      .rent-change h3 { margin: 0 0 5px; color: ${rentChanged ? "#92400e" : "#134e4a"}; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
      .rent-change .amount { font-size: 24px; font-weight: 700; color: ${rentChanged ? "#b45309" : "#0f766e"}; margin: 0; }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        text-align: center;
      }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #0d9488; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Lease Renewal Offer</h1>
        <p>Your landlord would like to renew your lease</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>

        <p class="message">
          Your landlord has offered a lease renewal for your unit. Please review the new terms below and accept or decline the offer from your dashboard.
        </p>

        <div class="renewal-details">
          <h3>Renewal Details</h3>
          <div class="detail-row">
            <span class="detail-label">Property:</span>
            <span class="detail-value">${propertyName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Unit:</span>
            <span class="detail-value">${unitNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">New Start:</span>
            <span class="detail-value">${formatDate(newLeaseStart)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">New End:</span>
            <span class="detail-value">${formatDate(newLeaseEnd)}</span>
          </div>
        </div>

        <div class="rent-change">
          <h3>${rentChanged ? "New Monthly Rent" : "Monthly Rent"}</h3>
          <p class="amount">${newRentFormatted}</p>
          ${rentChanged ? `<p style="margin: 5px 0 0; font-size: 13px; color: #78350f;">Previously: ${currentRentFormatted}</p>` : ""}
        </div>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            Review Renewal
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
