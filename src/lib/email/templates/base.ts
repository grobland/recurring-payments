const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Subscription Manager";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

interface EmailLayoutProps {
  previewText: string;
  content: string;
}

export function emailLayout({ previewText, content }: EmailLayoutProps): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${APP_NAME}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #ffffff;
      border-radius: 8px;
      padding: 32px;
      margin: 20px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #e4e4e7;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #18181b;
    }
    .button {
      display: inline-block;
      background-color: #18181b;
      color: #ffffff !important;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #27272a;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      color: #71717a;
      font-size: 14px;
    }
    .muted {
      color: #71717a;
      font-size: 14px;
    }
    h1 {
      color: #18181b;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      margin: 12px 0;
    }
    .preview-text {
      display: none;
      font-size: 1px;
      color: #f4f4f5;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <span class="preview-text">${previewText}</span>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">${APP_NAME}</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      <p><a href="${APP_URL}" style="color: #71717a;">${APP_URL}</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export { APP_NAME, APP_URL };
