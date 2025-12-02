
interface TenantInvitationEmailProps {
  tenantName: string;
  landlordName: string;
  unitAddress: string;
  unitNumber: string;
  onboardingUrl: string;
  expiresAt: Date;
}

export function getTenantInvitationEmailHtml({
  tenantName,
  landlordName,
  unitAddress,
  unitNumber,
  onboardingUrl,
  expiresAt,
}: TenantInvitationEmailProps): string {
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Your New Home</title>
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
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
      .property-details {
        background-color: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 20px;
        margin: 24px 0;
        border-radius: 4px;
      }
      .property-details h3 {
        margin: 0 0 10px;
        color: #1a1a1a;
        font-size: 16px;
      }
      .property-details p {
        margin: 5px 0;
        color: #555;
        font-size: 14px;
      }
      .cta-button {
        display: inline-block;
        padding: 16px 32px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #ffffff !important;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 16px;
        text-align: center;
        margin: 24px 0;
        transition: transform 0.2s;
      }
      .cta-button:hover {
        transform: translateY(-2px);
      }
      .steps-section {
        margin: 32px 0;
      }
      .steps-section h3 {
        color: #1a1a1a;
        font-size: 18px;
        margin-bottom: 16px;
      }
      .step {
        display: flex;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .step-number {
        background-color: #667eea;
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 14px;
        margin-right: 12px;
        flex-shrink: 0;
      }
      .step-content {
        flex: 1;
        padding-top: 3px;
      }
      .step-title {
        font-weight: 600;
        color: #1a1a1a;
        margin-bottom: 4px;
        font-size: 15px;
      }
      .step-description {
        color: #666;
        font-size: 14px;
      }
      .info-box {
        background-color: #fff3cd;
        border: 1px solid #ffc107;
        border-radius: 6px;
        padding: 16px;
        margin: 24px 0;
      }
      .info-box p {
        margin: 0;
        color: #856404;
        font-size: 14px;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 30px;
        text-align: center;
        border-top: 1px solid #e9ecef;
      }
      .footer p {
        margin: 8px 0;
        color: #666;
        font-size: 13px;
      }
      .footer a {
        color: #667eea;
        text-decoration: none;
      }
      .divider {
        height: 1px;
        background-color: #e9ecef;
        margin: 32px 0;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🏠 Welcome to Your New Home!</h1>
        <p>Let's get you moved in</p>
      </div>
      
      <div class="content">
        <p class="greeting">Hi ${tenantName},</p>
        
        <p class="message">
          Great news! ${landlordName} has invited you to begin your tenant onboarding process. 
          We're excited to help you settle into your new home.
        </p>
        
        <div class="property-details">
          <h3>📍 Your New Property</h3>
          <p><strong>Unit:</strong> ${unitNumber}</p>
          <p><strong>Address:</strong> ${unitAddress}</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${onboardingUrl}" class="cta-button">
            Start Onboarding Process
          </a>
        </div>
        
        <div class="info-box">
          <p><strong>⏰ Important:</strong> This invitation expires on ${expiryDate}. Please complete your onboarding before then.</p>
        </div>
        
        <div class="divider"></div>
        
        <div class="steps-section">
          <h3>What to Expect</h3>
          
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <div class="step-title">Personal & Contact Information</div>
              <div class="step-description">Share your basic details and how we can reach you</div>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <div class="step-title">Employment & Income Verification</div>
              <div class="step-description">Provide your employment details and income information</div>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">Rental History & References</div>
              <div class="step-description">Tell us about your previous rentals and provide references</div>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <div class="step-title">Emergency Contacts</div>
              <div class="step-description">Add people we can contact in case of emergency</div>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">5</div>
            <div class="step-content">
              <div class="step-title">Document Uploads</div>
              <div class="step-description">Upload required documents (ID, pay stubs, etc.)</div>
            </div>
          </div>
          
          <div class="step">
            <div class="step-number">6</div>
            <div class="step-content">
              <div class="step-title">Review & Sign Agreement</div>
              <div class="step-description">Review your information and digitally sign your lease</div>
            </div>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <p class="message">
          <strong>💾 Save Your Progress:</strong> Don't worry if you can't complete everything at once! 
          You can save your progress at any step and return later using the same link.
        </p>
        
        <p class="message">
          <strong>🔒 Your Privacy Matters:</strong> All information you provide is encrypted and stored securely. 
          We only share necessary details with your landlord for verification purposes.
        </p>
        
        <p class="message">
          If you have any questions or need assistance, don't hesitate to reach out to ${landlordName} 
          or our support team.
        </p>
      </div>
      
      <div class="footer">
        <p><strong>Rentr Property Management</strong></p>
        <p>Making renting simple and stress-free</p>
        <p style="margin-top: 16px;">
          <a href="#">Help Center</a> · <a href="#">Contact Support</a> · <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  </body>
</html>
  `;
}

export function getTenantInvitationEmailText({
  tenantName,
  landlordName,
  unitAddress,
  unitNumber,
  onboardingUrl,
  expiresAt,
}: TenantInvitationEmailProps): string {
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
Welcome to Your New Home!

Hi ${tenantName},

Great news! ${landlordName} has invited you to begin your tenant onboarding process. We're excited to help you settle into your new home.

Your New Property:
Unit: ${unitNumber}
Address: ${unitAddress}

Get Started: ${onboardingUrl}

IMPORTANT: This invitation expires on ${expiryDate}. Please complete your onboarding before then.

What to Expect:

1. Personal & Contact Information
   Share your basic details and how we can reach you

2. Employment & Income Verification
   Provide your employment details and income information

3. Rental History & References
   Tell us about your previous rentals and provide references

4. Emergency Contacts
   Add people we can contact in case of emergency

5. Document Uploads
   Upload required documents (ID, pay stubs, etc.)

6. Review & Sign Agreement
   Review your information and digitally sign your lease

Save Your Progress: You can save your progress at any step and return later using the same link.

Your Privacy Matters: All information you provide is encrypted and stored securely.

If you have any questions or need assistance, don't hesitate to reach out to ${landlordName} or our support team.

Best regards,
Rentr Property Management
Making renting simple and stress-free
  `;
}
