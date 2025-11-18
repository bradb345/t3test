/**
 * Welcome Email Template
 * A simple welcome email to demonstrate email structure
 */

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function welcomeEmail(userName: string, baseUrl: string): string {
  const safeUserName = escapeHtml(userName);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
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
      background-color: #4F46E5;
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
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    .footer {
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to Rentr!</h1>
  </div>
  <div class="content">
    <p>Hello ${safeUserName},</p>
    <p>Thank you for joining Rentr! We're excited to have you on board.</p>
    <p>You can now start listing your properties and connecting with potential renters.</p>
    <a href="${baseUrl}/my-properties" class="button">Get Started</a>
  </div>
  <div class="footer">
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <p>&copy; ${new Date().getFullYear()} Rentr. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
