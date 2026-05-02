export const verificationEmailTemplate = (name, verifyUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#F0F7F4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#2D6A4F;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;font-weight:700;letter-spacing:-0.5px;">NutriNavigator</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Your organic food companion</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1A1A1A;font-size:22px;">Verify your email, ${name} 👋</h2>
              <p style="margin:0 0 24px;color:#4A4A4A;font-size:15px;line-height:1.6;">
                Thanks for signing up! Click the button below to verify your email address and activate your account.
                This link expires in <strong>30 mins</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}"
                   style="background:#2D6A4F;color:white;padding:14px 36px;border-radius:9999px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                  Verify Email Address
                </a>
              </div>
              <p style="margin:24px 0 0;color:#737373;font-size:13px;line-height:1.6;">
                If you didn't create an account, you can safely ignore this email.<br/>
                Or copy this link into your browser:<br/>
                <a href="${verifyUrl}" style="color:#2D6A4F;word-break:break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F0F7F4;padding:20px 40px;text-align:center;border-top:1px solid #DCF0E6;">
              <p style="margin:0;color:#A0A0A0;font-size:12px;">© ${new Date().getFullYear()} NutriNavigator · Made with ♥ by Rez_Wizardry</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const passwordResetEmailTemplate = (name, resetUrl) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F0F7F4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#2D6A4F;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">NutriNavigator</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 12px;color:#1A1A1A;font-size:22px;">Reset your password</h2>
              <p style="margin:0 0 24px;color:#4A4A4A;font-size:15px;line-height:1.6;">
                Hi ${name}, we received a request to reset your password. Click below to set a new one.
                This link expires in <strong>15 minutes</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="background:#2D6A4F;color:white;padding:14px 36px;border-radius:9999px;text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
                  Reset Password
                </a>
              </div>
              <p style="margin:24px 0 0;color:#737373;font-size:13px;line-height:1.6;">
                If you didn't request this, ignore this email — your password won't change.<br/>
                <a href="${resetUrl}" style="color:#2D6A4F;word-break:break-all;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#F0F7F4;padding:20px 40px;text-align:center;border-top:1px solid #DCF0E6;">
              <p style="margin:0;color:#A0A0A0;font-size:12px;">© ${new Date().getFullYear()} NutriNavigator</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;