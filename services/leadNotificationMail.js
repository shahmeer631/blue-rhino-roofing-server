import nodemailer from 'nodemailer';

const DEFAULT_NOTIFICATION_TO = 'Help@BlueRhinoRoofing.net';

/** "Blue Rhino Roofing" <address@domain.com> — looks more legitimate to filters than a bare address. */
function getFromHeader() {
  const addr = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  if (!addr) return '';
  const rawName = (process.env.SMTP_FROM_NAME || 'Blue Rhino Roofing').trim().replace(/"/g, '');
  return `"${rawName}" <${addr}>`;
}

function getMailboxAddress() {
  return (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Gmail SMTP via Nodemailer. Set SMTP_USER + SMTP_PASS (Google App Password).
 * https://support.google.com/mail/answer/185833
 */
function getTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user?.trim() || !pass?.trim()) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.replace(/\s/g, ''),
    },
  });
}

/** Run after server starts; logs whether Gmail accepts SMTP login (App Password). */
export async function verifyLeadEmailSmtp() {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(
      '⚠️  Lead emails disabled: set SMTP_USER and SMTP_PASS (Google App Password) in server/.env'
    );
    return false;
  }
  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP authenticated — lead notification + confirmation emails can be sent.');
    return true;
  } catch (err) {
    console.error('❌ Gmail SMTP login failed — no lead emails will be delivered until this is fixed.');
    console.error('   Error:', err.message);
    console.error(
      '   For Help@BlueRhinoRoofing.net (Google Workspace): enable 2-Step Verification for that user,'
    );
    console.error(
      '   then create an App Password (Google Account → Security → App passwords). Paste it as SMTP_PASS.'
    );
    console.error('   Use your full Workspace address as SMTP_USER. Do not use a SendGrid key or normal password.');
    return false;
  }
}

function formatLeadLines(lead) {
  const id = lead._id?.toString?.() ?? lead.id ?? 'n/a';
  const lines = [
    'New lead submitted on the Blue Rhino Roofing website.',
    '',
    `Source: ${lead.source ?? 'unknown'}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `Address: ${lead.address}`,
    `Roof type: ${lead.roofType}`,
    `Damage / need: ${lead.damageType}`,
  ];
  if (lead.notes?.trim()) {
    lines.push(`Notes: ${lead.notes.trim()}`);
  }
  lines.push('', `Lead ID: ${id}`);
  return lines;
}

/**
 * Sends an internal notification for a newly saved lead (Gmail SMTP).
 * Fails softly: callers should `.catch()` and log; omitting env skips send.
 */
export async function sendNewLeadNotification(lead) {
  const to = process.env.LEAD_NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_TO;
  const from = getFromHeader();
  const mailbox = getMailboxAddress();

  const transporter = getTransporter();
  if (!transporter) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('SMTP_USER/SMTP_PASS (or GMAIL_USER + GMAIL_APP_PASSWORD) not set; skipping lead notification email.');
    }
    return;
  }
  if (!mailbox || !from) {
    console.warn('Set SMTP_USER (your Gmail address) or SMTP_FROM_EMAIL for the From field.');
    return;
  }

  const lines = formatLeadLines(lead);
  const text = lines.join('\n');
  const htmlBody = `<pre style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(
    text
  )}</pre>`;

  const sourceLabel = lead.source ?? 'lead';
  const subject = `[Blue Rhino] New ${sourceLabel} lead — ${lead.name}`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: htmlBody,
  });
}

const PLACEHOLDER_EMAIL = /via-chatbot@|@pending\.com$/i;

export function shouldSendCustomerConfirmation(lead) {
  if (process.env.SEND_CUSTOMER_LEAD_CONFIRMATION === 'false') return false;
  const addr = lead?.email?.trim();
  if (!addr || PLACEHOLDER_EMAIL.test(addr)) return false;
  return /^\S+@\S+\.\S+$/.test(addr);
}

/**
 * Thank-you email to the address the visitor entered on the form.
 */
export async function sendLeadCustomerConfirmation(lead) {
  if (!shouldSendCustomerConfirmation(lead)) return;

  const from = getFromHeader();
  const mailbox = getMailboxAddress();

  const transporter = getTransporter();
  if (!transporter || !mailbox || !from) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Skipping customer confirmation: Gmail SMTP not configured.');
    }
    return;
  }

  const first = String(lead.name || 'there').trim().split(/\s+/)[0];
  const source = lead.source === 'contact-page' ? 'message' : 'estimate request';
  const text = [
    `Hi ${first},`,
    '',
    `Thanks for your ${source} to Blue Rhino Roofing. We've received your information and will contact you within 30 minutes during business hours.`,
    '',
    `If you need us sooner, call (346) 733-8558.`,
    '',
    '— Blue Rhino Roofing',
    '2717 Commercial Center Blvd, Suite E200, Katy, TX 77494',
    'www.bluerhinoroofing.net',
  ].join('\n');

  const html = `
  <p>Hi ${escapeHtml(first)},</p>
  <p>Thanks for your <strong>${escapeHtml(source)}</strong> to Blue Rhino Roofing. We've received your information and will contact you within 30 minutes during business hours.</p>
  <p>If you need us sooner, call <a href="tel:+13467338558">(346) 733-8558</a>.</p>
  <p>— Blue Rhino Roofing<br/>
  2717 Commercial Center Blvd, Suite E200, Katy, TX 77494<br/>
  <a href="https://www.bluerhinoroofing.net">www.bluerhinoroofing.net</a></p>`;

  await transporter.sendMail({
    from,
    to: lead.email.trim(),
    replyTo: process.env.LEAD_NOTIFICATION_EMAIL || DEFAULT_NOTIFICATION_TO,
    subject: 'We received your request — Blue Rhino Roofing',
    text,
    html,
  });
}
