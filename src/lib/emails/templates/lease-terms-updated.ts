import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function leaseTermsUpdatedEmail(
  params: EmailMap["lease_terms_updated"]
): { subject: string; html: string } {
  const tenantName = escapeHtml(params.tenantName);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);
  const dashboardUrl = escapeHtml(params.dashboardUrl);
  const { leaseStart, leaseEnd } = params;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const formatMoney = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: params.currency,
    }).format(num);
  };

  const rentFormatted = formatMoney(params.monthlyRent);
  const depositFormatted = params.securityDeposit
    ? formatMoney(params.securityDeposit)
    : null;

  return {
    subject: `Lease Terms Updated for Unit ${unitNumber}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lease Terms Updated</title>
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
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        padding: 40px 30px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .terms-details {
        background-color: #eff6ff;
        border-left: 4px solid #2563eb;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .terms-details h3 { margin: 0 0 15px; color: #1e3a5f; font-size: 16px; }
      .detail-row { display: flex; margin: 8px 0; font-size: 14px; }
      .detail-label { color: #1e40af; font-weight: 600; min-width: 140px; }
      .detail-value { color: #555; }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        text-align: center;
      }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #2563eb; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Lease Terms Updated</h1>
        <p>Your landlord has updated your lease terms</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>

        <p class="message">
          The lease terms for your unit have been updated before signing. Please review the current terms below and sign in to your dashboard for more details.
        </p>

        <div class="terms-details">
          <h3>Updated Lease Terms</h3>
          <div class="detail-row">
            <span class="detail-label">Property:</span>
            <span class="detail-value">${propertyName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Unit:</span>
            <span class="detail-value">${unitNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lease Start:</span>
            <span class="detail-value">${formatDate(leaseStart)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Lease End:</span>
            <span class="detail-value">${formatDate(leaseEnd)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Monthly Rent:</span>
            <span class="detail-value">${rentFormatted}</span>
          </div>
          ${
            depositFormatted
              ? `<div class="detail-row">
            <span class="detail-label">Security Deposit:</span>
            <span class="detail-value">${depositFormatted}</span>
          </div>`
              : ""
          }
          <div class="detail-row">
            <span class="detail-label">Rent Due Day:</span>
            <span class="detail-value">${params.rentDueDay}${getOrdinalSuffix(params.rentDueDay)} of each month</span>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            Review on Dashboard
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

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}
