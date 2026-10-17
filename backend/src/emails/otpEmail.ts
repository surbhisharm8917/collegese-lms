/**
 * Transactional one-time-passcode email template.
 *
 * Deliverability notes (why this template looks the way it does):
 *  - Table-based layout with inline CSS: the only thing Outlook/Gmail render
 *    consistently. No external stylesheets, no <style> blocks that get stripped.
 *  - No remote images at all. Image-blocking is on by default in many clients,
 *    and image-only mail is a strong spam signal. The wordmark is live text.
 *  - A plain-text alternative is always sent alongside the HTML.
 *  - A hidden preheader controls the inbox preview line instead of leaking
 *    markup into it.
 *  - No tracking pixels, no redirect/shortener links, one clear purpose per
 *    message, and a real postal/contact footer.
 */

const BRAND = {
  name: "Just Easy CA Classes",
  legalName: "Just Easy CA Classes Private Limited",
  accent: "#EA580C",
  accentSoft: "#FFF7ED",
  ink: "#0F172A",
  body: "#475569",
  muted: "#94A3B8",
  border: "#E2E8F0",
  canvas: "#F1F5F9",
} as const;

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const MONO_STACK = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export type OtpEmailPurpose = "REGISTRATION" | "LOGIN";

export type OtpEmailInput = {
  recipientName?: string | null;
  code: string;
  purpose: OtpEmailPurpose;
  expiryMinutes: number;
  supportEmail: string;
};

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!,
  );

/** Groups the digits so the code is easy to read aloud and transcribe. */
const spacedCode = (code: string): string =>
  code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;

const copyFor = (purpose: OtpEmailPurpose) =>
  purpose === "REGISTRATION"
    ? {
        subjectPrefix: "Confirm your email",
        heading: "Confirm your email address",
        preheader: "Enter this code to finish setting up your account.",
        intro:
          "Welcome aboard. Enter the code below on the sign-up screen to confirm this email address and activate your account.",
        label: "Your confirmation code",
        footnote:
          "If you did not create an account with us, you can safely ignore this email and no account will be activated.",
      }
    : {
        subjectPrefix: "Your sign-in code",
        heading: "Verify your sign-in",
        preheader: "Enter this code to finish signing in.",
        intro:
          "We received a sign-in attempt for your account. Enter the code below to finish signing in.",
        label: "Your sign-in code",
        footnote:
          "If this was not you, someone may know your password. Ignore this email and change your password as soon as you can.",
      };

export const otpEmailSubject = (input: Pick<OtpEmailInput, "code" | "purpose">): string =>
  // The code in the subject line lets people read it straight from the inbox
  // list. Kept short, sentence case, no all-caps or exclamation marks.
  `${copyFor(input.purpose).subjectPrefix}: ${input.code}`;

export const otpEmailText = (input: OtpEmailInput): string => {
  const copy = copyFor(input.purpose);
  const greeting = input.recipientName?.trim() ? `Hello ${input.recipientName.trim()},` : "Hello,";

  return [
    `${BRAND.name}`,
    "",
    greeting,
    "",
    copy.intro,
    "",
    `${copy.label}: ${input.code}`,
    "",
    `This code expires in ${input.expiryMinutes} minutes and can only be used once.`,
    "",
    "Never share this code with anyone. Our team will never ask you for it by phone, chat, or email.",
    "",
    copy.footnote,
    "",
    "--",
    BRAND.legalName,
    `Need help? Write to ${input.supportEmail}`,
    "This is an automated security message sent to the address used on your account.",
  ].join("\n");
};

export const otpEmailHtml = (input: OtpEmailInput): string => {
  const copy = copyFor(input.purpose);
  const name = input.recipientName?.trim();
  const greeting = name ? `Hello ${escapeHtml(name)},` : "Hello,";
  const support = escapeHtml(input.supportEmail);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(copy.heading)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${BRAND.canvas};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.canvas};">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

<tr>
<td style="padding:0 8px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="left" style="font-family:${FONT_STACK};font-size:17px;font-weight:700;letter-spacing:-0.2px;color:${BRAND.ink};">
${BRAND.name}
</td>
<td align="right" style="font-family:${FONT_STACK};font-size:11px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.muted};">
Security
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="background-color:#FFFFFF;border:1px solid ${BRAND.border};border-radius:14px;padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

<tr><td style="height:4px;background-color:${BRAND.accent};border-radius:14px 14px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

<tr>
<td style="padding:36px 40px 8px;">
<h1 style="margin:0;font-family:${FONT_STACK};font-size:23px;line-height:31px;font-weight:700;letter-spacing:-0.3px;color:${BRAND.ink};">${escapeHtml(copy.heading)}</h1>
</td>
</tr>

<tr>
<td style="padding:14px 40px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${BRAND.body};">
${greeting}
</td>
</tr>

<tr>
<td style="padding:10px 40px 0;font-family:${FONT_STACK};font-size:15px;line-height:24px;color:${BRAND.body};">
${escapeHtml(copy.intro)}
</td>
</tr>

<tr>
<td style="padding:28px 40px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.accentSoft};border:1px solid #FED7AA;border-radius:12px;">
<tr>
<td align="center" style="padding:22px 16px 6px;font-family:${FONT_STACK};font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#C2410C;">
${escapeHtml(copy.label)}
</td>
</tr>
<tr>
<td align="center" style="padding:0 16px 6px;font-family:${MONO_STACK};font-size:38px;line-height:48px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};">
${escapeHtml(spacedCode(input.code))}
</td>
</tr>
<tr>
<td align="center" style="padding:0 16px 22px;font-family:${FONT_STACK};font-size:13px;line-height:20px;color:#9A3412;">
Expires in ${input.expiryMinutes} minutes &middot; single use
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:26px 40px 0;font-family:${FONT_STACK};font-size:14px;line-height:22px;color:${BRAND.body};">
<strong style="color:${BRAND.ink};">Keep this code to yourself.</strong> Our team will never ask you for it by phone, chat, or email.
</td>
</tr>

<tr>
<td style="padding:20px 40px 0;">
<div style="height:1px;background-color:${BRAND.border};font-size:0;line-height:0;">&nbsp;</div>
</td>
</tr>

<tr>
<td style="padding:18px 40px 34px;font-family:${FONT_STACK};font-size:13px;line-height:21px;color:${BRAND.muted};">
${escapeHtml(copy.footnote)}
</td>
</tr>

</table>
</td>
</tr>

<tr>
<td style="padding:22px 8px 0;font-family:${FONT_STACK};font-size:12px;line-height:20px;color:${BRAND.muted};" align="center">
${BRAND.legalName}<br />
Need help? Write to <a href="mailto:${support}" style="color:${BRAND.body};text-decoration:underline;">${support}</a><br />
<span style="color:#B6C2CF;">This is an automated security message sent to the address on your account. You cannot reply to it.</span>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
};
