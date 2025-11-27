interface OnboardingCompleteEmailProps {
  landlordName: string;
  tenantName: string;
  tenantEmail: string;
  unitAddress: string;
  unitNumber: string;
  isExistingTenant: boolean;
  tenantAttached?: boolean;
  dashboardUrl: string;
}

export function getOnboardingCompleteEmailHtml({
  landlordName,
  tenantName,
  tenantEmail,
  unitAddress,
  unitNumber,
  isExistingTenant,
  tenantAttached,
  dashboardUrl,
}: OnboardingCompleteEmailProps): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Onboarding Complete</title>
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
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        padding: 40px 30px;
        text-align: center;
        color: #ffffff;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .header p {
        margin: 10px 0 0;
        font-size: 16px;
        opacity: 0.95;
      }
      .content {
        padding: 40px 30px;
      }
      .greeting {
        font-size: 18px;
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 20px;
      }
      .message {
        color: #555;
        font-size: 15px;
        margin-bottom: 24px;
      }
      .tenant-details {
        background-color: #f0fdf4;
        border-left: 4px solid #10b981;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .tenant-details h3 {
        margin: 0 0 10px;
        color: #1a1a1a;
        font-size: 16px;
      }
      .tenant-details p {
        margin: 5px 0;
        color: #555;
        font-size: 14px;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        background-color: #dbeafe;
        color: #1e40af;
        font-size: 12px;
        font-weight: 600;
        border-radius: 9999px;
        margin-top: 10px;
      }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        margin-top: 16px;
        text-align: center;
      }
      .footer {
        padding: 30px;
        background-color: #f8f9fa;
        text-align: center;
        font-size: 13px;
        color: #666;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>✅ Onboarding Complete!</h1>
        <p>Your tenant has completed their application</p>
      </div>

      <div class="content">
        <p class="greeting">Hi ${landlordName},</p>

        <p class="message">
          Great news! <strong>${tenantName}</strong> has successfully completed their 
          tenant onboarding for your property. All required information and documents 
          have been submitted.
        </p>

        <div class="tenant-details">
          <h3>📋 Tenant Details</h3>
          <p><strong>Name:</strong> ${tenantName}</p>
          <p><strong>Email:</strong> ${tenantEmail}</p>
          <p><strong>Property:</strong> ${unitAddress}</p>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          ${isExistingTenant ? '<span class="badge">Existing Tenant</span>' : '<span class="badge">New Tenant</span>'}
          ${tenantAttached ? '<span class="badge" style="background-color: #dcfce7; color: #166534; margin-left: 8px;">Lease Created</span>' : ''}
        </div>

        <p class="message">
          ${tenantAttached 
            ? `A lease has been automatically created and ${tenantName} is now attached to Unit ${unitNumber}. The unit has been marked as unavailable.` 
            : 'You can now review their submitted information, including employment details, emergency contacts, proof of address, and photo ID in your dashboard.'}
        </p>

        <div style="text-align: center;">
          <a href="${dashboardUrl}" class="cta-button">
            View Tenant Details
          </a>
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
`;
}

export function getOnboardingCompleteEmailSubject(tenantName: string): string {
  return `✅ ${tenantName} has completed their tenant onboarding`;
}
