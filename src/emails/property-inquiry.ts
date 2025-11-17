/**
 * Property Inquiry Email Template
 * Sent when a potential renter inquires about a property
 */
export function propertyInquiryEmail(
  propertyOwnerName: string,
  propertyAddress: string,
  inquirerName: string,
  inquirerEmail: string,
  message: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Property Inquiry</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #10b981;
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .info-box {
      background-color: white;
      border: 1px solid #e5e7eb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 6px;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .button {
      display: inline-block;
      background-color: #10b981;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Property Inquiry</h1>
  </div>
  <div class="content">
    <p>Hello ${propertyOwnerName},</p>
    <p>You have received a new inquiry for your property:</p>
    
    <div class="info-box">
      <div class="label">Property Address</div>
      <div>${propertyAddress}</div>
    </div>

    <div class="info-box">
      <div class="label">From</div>
      <div>${inquirerName}</div>
      <div style="color: #6b7280; font-size: 14px;">${inquirerEmail}</div>
    </div>

    <div class="info-box">
      <div class="label">Message</div>
      <div>${message}</div>
    </div>

    <a href="https://yourapp.com/messages" class="button">View Messages</a>
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Rentr. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
