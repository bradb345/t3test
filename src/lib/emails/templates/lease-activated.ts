import type { EmailMap } from "~/lib/emails";

export function leaseActivatedEmail(
  params: EmailMap["lease_activated"]
): { subject: string; html: string } {
  const { tenantName, unitNumber, propertyName, monthlyRent, currency, dashboardUrl } = params;

  const formattedRent = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(monthlyRent));

  return {
    subject: `Lease Activated - Unit ${unitNumber} at ${propertyName}`,
    html: `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lease Activated</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f7; }
      .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: #ffffff; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
      .header p { margin: 10px 0 0; font-size: 16px; opacity: 0.95; }
      .content { padding: 40px 30px; }
      .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }
      .message { color: #555; font-size: 15px; margin-bottom: 24px; }
      .details { background-color: #eff6ff; border-left: 4px solid #667eea; padding: 20px; margin: 24px 0; border-radius: 4px; }
      .details h3 { margin: 0 0 10px; color: #1a1a1a; font-size: 16px; }
      .details p { margin: 5px 0; color: #555; font-size: 14px; }
      .cta-button { display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-top: 16px; text-align: center; }
      .footer { padding: 30px; background-color: #f8f9fa; text-align: center; font-size: 13px; color: #666; }
      .footer a { color: #667eea; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Lease Activated!</h1>
        <p>Your lease has been signed and is now active</p>
      </div>
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        <p class="message">
          Your lease for <strong>Unit ${unitNumber}</strong> at <strong>${propertyName}</strong>
          has been signed and activated. Welcome to your new home!
        </p>
        <div class="details">
          <h3>Lease Details</h3>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          <p><strong>Property:</strong> ${propertyName}</p>
          <p><strong>Monthly Rent:</strong> ${formattedRent}</p>
        </div>
        <p class="message">
          Please sign in to make your move-in payment and view your lease documents.
        </p>
        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>
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
