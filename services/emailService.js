const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const tempDir = path.join(__dirname, '..', 'temp');
const verificationLogPath = path.join(tempDir, 'verification-codes.log');
let transporterPromise = null;

function ensureTempDir() {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
}

function getGmailTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = Promise.resolve(
    nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_APP_PASSWORD
      }
    })
  );

  return transporterPromise;
}

async function sendVerificationEmail({ email, codigo, tipo }) {
  const mailFrom = process.env.MAIL_FROM;
  const resendApiKey = process.env.RESEND_API_KEY;
  const isProduction = process.env.NODE_ENV === 'production';
  const mailMode = (process.env.MAIL_MODE || 'local').toLowerCase();
  const mailUser = process.env.MAIL_USER;
  const mailAppPassword = process.env.MAIL_APP_PASSWORD;
  const hasResendConfig =
    mailMode === 'remote' &&
    resendApiKey &&
    mailFrom &&
    resendApiKey !== 'reemplaza_con_tu_api_key_de_resend' &&
    !mailFrom.includes('reemplaza');
  const hasGmailConfig =
    (mailMode === 'gmail' || mailMode === 'smtp') &&
    mailUser &&
    mailAppPassword &&
    mailFrom;

  const subject =
    tipo === 'recuperacion'
      ? 'Recupera tu acceso a Sweety Puppies'
      : 'Tu codigo de verificacion de Sweety Puppies';

  const html = `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 18px 50px rgba(188,93,160,0.18); border:1px solid #ffd9ed;">
        <div style="padding:28px 32px; background:linear-gradient(135deg,#ffd7ec 0%,#ffeaf5 50%,#def7f4 100%); text-align:center;">
          <div style="display:inline-block; background:#ffffff; color:#9c0076; font-weight:700; font-size:13px; padding:8px 14px; border-radius:999px; margin-bottom:14px;">
            Sweety Puppies
          </div>
          <h1 style="margin:0; font-size:32px; line-height:1.1; color:#8f176e;">${tipo === 'recuperacion' ? 'Recupera tu acceso' : 'Verifica tu cuenta'}</h1>
          <p style="margin:14px 0 0; font-size:16px; color:#6e4b60;">Un paso más y tu peludito estará más cerca de su próxima sesión de glamour.</p>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 14px; font-size:16px;">Hola,</p>
          <p style="margin:0 0 18px; font-size:16px; line-height:1.7;">
            ${
              tipo === 'recuperacion'
                ? 'Recibimos una solicitud para ayudarte a recuperar el acceso a tu cuenta.'
                : 'Gracias por registrarte en Sweety Puppies. Usa este código para confirmar tu correo electrónico.'
            }
          </p>
          <div style="margin:28px 0; padding:24px; border-radius:24px; background:linear-gradient(135deg,#fff2fa 0%,#fefbff 100%); border:1px dashed #f2b4dc; text-align:center;">
            <p style="margin:0 0 10px; font-size:14px; letter-spacing:1.5px; text-transform:uppercase; color:#9c0076; font-weight:700;">Codigo de seguridad</p>
            <div style="font-size:40px; line-height:1; font-weight:800; letter-spacing:10px; color:#e059b6;">${codigo}</div>
          </div>
          <p style="margin:0 0 12px; font-size:15px; line-height:1.7;">Este código vence en <strong>15 minutos</strong>.</p>
          <p style="margin:0; font-size:15px; line-height:1.7;">Si no realizaste esta solicitud, puedes ignorar este correo con tranquilidad.</p>
        </div>
        <div style="padding:22px 32px; background:#fff7fb; border-top:1px solid #ffe2f1; text-align:center;">
          <p style="margin:0; font-size:13px; color:#8a6a7c;">Sweety Puppies • cuidado tierno, seguro y con mucho estilo</p>
        </div>
      </div>
    </div>
  `;

  const text = `
Sweety Puppies

${tipo === 'recuperacion' ? 'Recupera tu acceso' : 'Verifica tu cuenta'}

Tu codigo es: ${codigo}

Este codigo vence en 15 minutos.
Si no realizaste esta solicitud, puedes ignorar este correo.
  `.trim();

  if (hasGmailConfig) {
    const transporter = await getGmailTransporter();

    await transporter.sendMail({
      from: mailFrom,
      to: email,
      subject,
      html,
      text
    });

    return {
      delivered: true,
      previewCode: null,
      mode: 'gmail'
    };
  }

  if (hasResendConfig) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: mailFrom,
        to: email,
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`No se pudo enviar el correo: ${errorBody}`);
    }

    return { delivered: true, previewCode: null };
  }

  ensureTempDir();
  const logLine = `[${new Date().toISOString()}] ${tipo.toUpperCase()} ${email} => ${codigo}\n`;
  fs.appendFileSync(verificationLogPath, logLine, 'utf8');

  return {
    delivered: !isProduction,
    previewCode: isProduction ? null : codigo,
    fallbackPath: verificationLogPath,
    mode: 'local'
  };
}

module.exports = {
  sendVerificationEmail,
  verificationLogPath
};
