import type { EmailMap } from "~/lib/emails";
import { escapeHtml } from "~/lib/html";

export function paymentOverdueLandlordEmail(
  params: EmailMap["payment_overdue_landlord"]
): { subject: string; html: string } {
  const { amount, currency } = params;
  const landlordName = escapeHtml(params.landlordName);
  const tenantName = escapeHtml(params.tenantName);
  const safeDueDate = escapeHtml(params.dueDate);
  const unitNumber = escapeHtml(params.unitNumber);
  const propertyName = escapeHtml(params.propertyName);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));

  return {
    subject: `Tenant Payment Overdue — Unit ${unitNumber}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Payment Overdue</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .details-box { background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 24px 0; }
      .details-box .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fecaca; }
      .details-box .row:last-child { border-bottom: none; }
      .details-box .label { font-size: 14px; color: #991b1b; font-weight: 600; }
      .details-box .value { font-size: 14px; color: #1a1a1a; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Tenant Payment Overdue</h1>
        <p>Unit ${unitNumber} at ${propertyName}</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${landlordName},</p>
        <p class="message">
          A tenant at your property has an overdue rent payment. The tenant's dashboard has been restricted to payment-only access until the balance is resolved.
        </p>
        <div class="details-box">
          <div class="row">
            <span class="label">Tenant</span>
            <span class="value">${tenantName}</span>
          </div>
          <div class="row">
            <span class="label">Unit</span>
            <span class="value">${unitNumber} at ${propertyName}</span>
          </div>
          <div class="row">
            <span class="label">Amount Overdue</span>
            <span class="value">${formattedAmount}</span>
          </div>
          <div class="row">
            <span class="label">Original Due Date</span>
            <span class="value">${safeDueDate}</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>This notification was sent by Rentr.</p>
      </div>
    </div>
  </body>
</html>
`,
  };
}
