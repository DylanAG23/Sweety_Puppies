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

  const delivery = await sendMail({
    to: email,
    subject,
    html,
    text,
    fallbackLogLine: `[${new Date().toISOString()}] ${tipo.toUpperCase()} ${email} => ${codigo}\n`,
    previewCode: codigo
  });

  return {
    delivered: delivery.delivered,
    previewCode: delivery.previewCode,
    fallbackPath: delivery.fallbackPath,
    mode: delivery.mode
  };
}

async function sendAppointmentRequestEmail({ email, appointment, reviewUrl, confirmUrl, cancelUrl, flowType = 'nueva' }) {
  const isReschedule = flowType === 'reprogramacion';
  const additionalLines = appointment.additionalServices.length
    ? appointment.additionalServices
        .map((item) => `<li style="margin:0 0 8px;">${item.nombre} - ${formatCurrency(item.precio)}</li>`)
        .join('')
    : '<li style="margin:0;">Sin servicios adicionales</li>';

  const summaryRows = [
    ['Cliente', appointment.clientName],
    ['Mascota', appointment.petName],
    ['Servicio principal', appointment.serviceName],
    [isReschedule ? 'Nueva fecha' : 'Fecha', appointment.dateLabel],
    [isReschedule ? 'Nueva hora' : 'Hora', appointment.timeLabel],
    ['Pelaje reportado', appointment.reportedCoatState],
    ['Comportamiento reportado', appointment.reportedBehavior],
    ['Precio estimado', formatCurrency(appointment.totalPrice)]
  ];

  if (isReschedule && appointment.previousDateLabel) {
    summaryRows.splice(3, 0, ['Fecha anterior', appointment.previousDateLabel]);
  }

  if (isReschedule && appointment.previousTimeLabel) {
    summaryRows.splice(4, 0, ['Hora anterior', appointment.previousTimeLabel]);
  }

  const summaryRowsHtml = summaryRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0; color:#8f176e; font-weight:700; width:190px;">${label}</td>
          <td style="padding:10px 0; color:#5f4557;">${value}</td>
        </tr>
      `
    )
    .join('');

  const requestTitle = isReschedule ? 'Reprogramacion pendiente por revisar' : 'Nueva cita pendiente por revisar';
  const requestCopy = isReschedule
    ? 'Un cliente reprogramo una cita y ya puedes decidir desde este mismo correo si deseas confirmarla o cancelarla.'
    : 'Un cliente acaba de solicitar una nueva visita y ya puedes decidirla desde este mismo correo.';

  const html = `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 18px 50px rgba(188,93,160,0.18); border:1px solid #ffd9ed;">
        <div style="padding:28px 32px; background:linear-gradient(135deg,#ffd7ec 0%,#ffeaf5 50%,#def7f4 100%); text-align:center;">
          <div style="display:inline-block; background:#ffffff; color:#9c0076; font-weight:700; font-size:13px; padding:8px 14px; border-radius:999px; margin-bottom:14px;">
            Sweety Puppies
          </div>
          <h1 style="margin:0; font-size:30px; line-height:1.1; color:#8f176e;">${requestTitle}</h1>
          <p style="margin:14px 0 0; font-size:16px; color:#6e4b60;">${requestCopy}</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%; border-collapse:collapse;">${summaryRowsHtml}</table>
          <div style="margin-top:26px; padding:22px; border-radius:22px; background:linear-gradient(135deg,#fff2fa 0%,#fefbff 100%); border:1px dashed #f2b4dc;">
            <p style="margin:0 0 12px; color:#8f176e; font-weight:700;">Servicios adicionales</p>
            <ul style="margin:0; padding-left:18px; color:#5f4557;">${additionalLines}</ul>
          </div>
          ${
            appointment.clientNotes
              ? `<p style="margin:24px 0 0; font-size:15px; line-height:1.7;"><strong>Observaciones del cliente:</strong> ${appointment.clientNotes}</p>`
              : ''
          }
          <div style="margin-top:28px; text-align:center;">
            <a href="${confirmUrl}" style="display:inline-block; margin:0 8px 12px; padding:14px 24px; border-radius:999px; background:linear-gradient(135deg,#c1008f 0%,#e95adb 100%); color:#ffffff; font-weight:700; text-decoration:none;">Confirmar cita</a>
            <a href="${cancelUrl}" style="display:inline-block; margin:0 8px 12px; padding:14px 24px; border-radius:999px; background:linear-gradient(135deg,#63d0e0 0%,#45bdd3 100%); color:#ffffff; font-weight:700; text-decoration:none;">Cancelar cita</a>
          </div>
          <div style="margin-top:8px; text-align:center;">
            <a href="${reviewUrl}" style="color:#8f176e; font-weight:700; text-decoration:none;">Ver detalle completo de la solicitud</a>
          </div>
        </div>
        <div style="padding:22px 32px; background:#fff7fb; border-top:1px solid #ffe2f1; text-align:center;">
          <p style="margin:0; font-size:13px; color:#8a6a7c;">Sweety Puppies - administracion de agenda</p>
        </div>
      </div>
    </div>
  `;

  const text = `
Sweety Puppies

${requestTitle}

Cliente: ${appointment.clientName}
Mascota: ${appointment.petName}
Servicio: ${appointment.serviceName}
${isReschedule && appointment.previousDateLabel ? `Fecha anterior: ${appointment.previousDateLabel}\n` : ''}${isReschedule && appointment.previousTimeLabel ? `Hora anterior: ${appointment.previousTimeLabel}\n` : ''}${isReschedule ? 'Nueva fecha' : 'Fecha'}: ${appointment.dateLabel}
${isReschedule ? 'Nueva hora' : 'Hora'}: ${appointment.timeLabel}
Pelaje reportado: ${appointment.reportedCoatState}
Comportamiento reportado: ${appointment.reportedBehavior}
Servicios adicionales: ${appointment.additionalServices.length ? appointment.additionalServices.map((item) => `${item.nombre} (${formatCurrency(item.precio)})`).join(', ') : 'Sin servicios adicionales'}
Precio estimado: ${formatCurrency(appointment.totalPrice)}
Observaciones: ${appointment.clientNotes || 'Sin observaciones'}

Confirmar cita: ${confirmUrl}
Cancelar cita: ${cancelUrl}
Ver detalle completo: ${reviewUrl}
  `.trim();

  return sendMail({
    to: email,
    subject: `${isReschedule ? 'Reprogramacion pendiente' : 'Nueva cita pendiente'}: ${appointment.petName} - ${appointment.dateLabel}`,
    html,
    text,
    fallbackLogLine: `[${new Date().toISOString()}] ${isReschedule ? 'REPROGRAMACION_PENDIENTE' : 'CITA_PENDIENTE'} ${email} => ${appointment.clientName} / ${appointment.petName} / ${appointment.dateLabel} ${appointment.timeLabel}\n`
  });
}

async function sendAppointmentStatusEmail({ email, appointment, status, flowType = 'nueva' }) {
  const isReschedule = flowType === 'reprogramacion';
  const contentByStatus = {
    confirmada: {
      title: isReschedule
        ? 'Sweety Puppies acepto y confirmo la reprogramacion de tu cita'
        : 'Tu cita fue confirmada por Sweety Puppies',
      copy: isReschedule
        ? 'La administracion de Sweety Puppies reviso tu cambio y ya confirmo la nueva fecha de la cita para tu peludito.'
        : 'La administracion de Sweety Puppies reviso tu solicitud y ya dejo confirmada la visita para tu peludito.',
      label: 'Confirmada'
    },
    cancelada: {
      title: isReschedule
        ? 'La reprogramacion de tu cita fue cancelada por Sweety Puppies'
        : 'Tu cita fue cancelada por Sweety Puppies',
      copy: isReschedule
        ? 'La administracion de Sweety Puppies no pudo aprobar esta reprogramacion y la solicitud quedo cancelada.'
        : 'La administracion de Sweety Puppies no pudo mantener esta solicitud y la cita quedo cancelada.',
      label: 'Cancelada'
    },
    en_atencion: {
      title: `La cita de ${appointment.petName} ya inicio en Sweety Puppies`,
      copy: 'La administracion de Sweety Puppies ya inicio la atencion de tu peludito. Te mantendremos al tanto del proceso.',
      label: 'En atencion'
    },
    completada: {
      title: `La cita de ${appointment.petName} fue finalizada por Sweety Puppies`,
      copy: 'La administracion de Sweety Puppies finalizo el servicio de tu peludito y ya quedo registrado en su historial.',
      label: 'Completada'
    }
  };
  const content = contentByStatus[status] || contentByStatus.cancelada;
  const statusTitle = content.title;
  const statusCopy = content.copy;

  const html = `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 18px 50px rgba(188,93,160,0.18); border:1px solid #ffd9ed;">
        <div style="padding:28px 32px; background:linear-gradient(135deg,#ffd7ec 0%,#ffeaf5 50%,#def7f4 100%); text-align:center;">
          <div style="display:inline-block; background:#ffffff; color:#9c0076; font-weight:700; font-size:13px; padding:8px 14px; border-radius:999px; margin-bottom:14px;">
            Sweety Puppies
          </div>
          <h1 style="margin:0; font-size:30px; line-height:1.1; color:#8f176e;">${statusTitle}</h1>
          <p style="margin:14px 0 0; font-size:16px; color:#6e4b60;">${statusCopy}</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700; width:180px;">Mascota</td><td style="padding:10px 0; color:#5f4557;">${appointment.petName}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Servicio</td><td style="padding:10px 0; color:#5f4557;">${appointment.serviceName}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Fecha</td><td style="padding:10px 0; color:#5f4557;">${appointment.dateLabel}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Hora</td><td style="padding:10px 0; color:#5f4557;">${appointment.timeLabel}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Estado</td><td style="padding:10px 0; color:#5f4557;">${content.label}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Precio estimado</td><td style="padding:10px 0; color:#5f4557;">${formatCurrency(appointment.totalPrice)}</td></tr>
          </table>
        </div>
        <div style="padding:22px 32px; background:#fff7fb; border-top:1px solid #ffe2f1; text-align:center;">
          <p style="margin:0; font-size:13px; color:#8a6a7c;">Sweety Puppies - cuidado tierno, seguro y con mucho estilo</p>
        </div>
      </div>
    </div>
  `;

  const text = `
Sweety Puppies

${statusTitle}

Mascota: ${appointment.petName}
Servicio: ${appointment.serviceName}
Fecha: ${appointment.dateLabel}
Hora: ${appointment.timeLabel}
Estado: ${content.label}
Precio estimado: ${formatCurrency(appointment.totalPrice)}
  `.trim();

  return sendMail({
    to: email,
    subject: `${statusTitle} - ${appointment.petName}`,
    html,
    text,
    fallbackLogLine: `[${new Date().toISOString()}] CITA_${status.toUpperCase()} ${email} => ${appointment.petName} / ${appointment.dateLabel} ${appointment.timeLabel}\n`
  });
}

async function sendAppointmentCancellationEmail({
  email,
  appointment,
  cancelledBy = 'administracion',
  cancellationReason,
  recipientRole = 'cliente',
  flowType = 'nueva'
}) {
  const isReschedule = flowType === 'reprogramacion';
  const reasonLabel = cancellationReason || 'No se registro un motivo especifico.';
  const cancelledByClient = cancelledBy === 'cliente';
  const isBusinessRecipient = recipientRole === 'negocio';

  let title = '';
  let copy = '';
  let subject = '';

  if (isBusinessRecipient && cancelledByClient) {
    title = `El cliente ${appointment.clientName} canceló la cita de ${appointment.petName}`;
    copy = 'La cita fue retirada desde el portal del cliente. Te compartimos el motivo registrado para que puedas hacer el seguimiento correspondiente.';
    subject = `Cliente canceló cita - ${appointment.petName}`;
  } else if (isBusinessRecipient) {
    title = `Se canceló la cita de ${appointment.petName} desde administración`;
    copy = 'La cita fue cancelada desde el panel administrativo. Este correo sirve como soporte interno del movimiento realizado.';
    subject = `Cita cancelada desde administración - ${appointment.petName}`;
  } else if (cancelledByClient) {
    title = isReschedule
      ? `Has cancelado la reprogramación de la cita de ${appointment.petName}`
      : `Has cancelado la cita de ${appointment.petName}`;
    copy = 'Tu solicitud fue cancelada correctamente. Si deseas volver a reservar, puedes hacerlo desde tu portal cuando lo necesites.';
    subject = `Has cancelado tu cita - ${appointment.petName}`;
  } else {
    title = isReschedule
      ? `Sweety Puppies canceló la reprogramación de la cita de ${appointment.petName}`
      : `Sweety Puppies canceló la cita de ${appointment.petName}`;
    copy = 'La administracion de Sweety Puppies tuvo que cancelar esta cita. Te compartimos el motivo registrado para que tengas claridad sobre el cambio.';
    subject = `Cita cancelada por Sweety Puppies - ${appointment.petName}`;
  }

  const html = `
    <div style="margin:0; padding:32px 16px; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
      <div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 18px 50px rgba(188,93,160,0.18); border:1px solid #ffd9ed;">
        <div style="padding:28px 32px; background:linear-gradient(135deg,#ffd7ec 0%,#ffeaf5 50%,#def7f4 100%); text-align:center;">
          <div style="display:inline-block; background:#ffffff; color:#9c0076; font-weight:700; font-size:13px; padding:8px 14px; border-radius:999px; margin-bottom:14px;">
            Sweety Puppies
          </div>
          <h1 style="margin:0; font-size:30px; line-height:1.1; color:#8f176e;">${title}</h1>
          <p style="margin:14px 0 0; font-size:16px; color:#6e4b60;">${copy}</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%; border-collapse:collapse;">
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700; width:180px;">Cliente</td><td style="padding:10px 0; color:#5f4557;">${appointment.clientName}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Mascota</td><td style="padding:10px 0; color:#5f4557;">${appointment.petName}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Servicio</td><td style="padding:10px 0; color:#5f4557;">${appointment.serviceName}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Fecha</td><td style="padding:10px 0; color:#5f4557;">${appointment.dateLabel}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Hora</td><td style="padding:10px 0; color:#5f4557;">${appointment.timeLabel}</td></tr>
            <tr><td style="padding:10px 0; color:#8f176e; font-weight:700;">Motivo de cancelación</td><td style="padding:10px 0; color:#5f4557;">${reasonLabel}</td></tr>
          </table>
        </div>
        <div style="padding:22px 32px; background:#fff7fb; border-top:1px solid #ffe2f1; text-align:center;">
          <p style="margin:0; font-size:13px; color:#8a6a7c;">Sweety Puppies - cuidado tierno, seguro y con mucho estilo</p>
        </div>
      </div>
    </div>
  `;

  const text = `
Sweety Puppies

${title}

Cliente: ${appointment.clientName}
Mascota: ${appointment.petName}
Servicio: ${appointment.serviceName}
Fecha: ${appointment.dateLabel}
Hora: ${appointment.timeLabel}
Motivo de cancelación: ${reasonLabel}
  `.trim();

  return sendMail({
    to: email,
    subject,
    html,
    text,
    fallbackLogLine: `[${new Date().toISOString()}] CITA_CANCELADA_${cancelledByClient ? 'CLIENTE' : 'ADMIN'}_${recipientRole.toUpperCase()} ${email} => ${appointment.petName} / ${appointment.dateLabel} ${appointment.timeLabel} / ${reasonLabel}\n`
  });
}

async function sendMail({ to, subject, html, text, fallbackLogLine, previewCode = null }) {
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

  if (hasGmailConfig) {
    const transporter = await getGmailTransporter();

    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      html,
      text
    });

    return {
      delivered: true,
      previewCode: null,
      fallbackPath: null,
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
        to,
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`No se pudo enviar el correo: ${errorBody}`);
    }

    return {
      delivered: true,
      previewCode: null,
      fallbackPath: null,
      mode: 'remote'
    };
  }

  ensureTempDir();
  fs.appendFileSync(verificationLogPath, fallbackLogLine, 'utf8');

  return {
    delivered: !isProduction,
    previewCode: isProduction ? null : previewCode,
    fallbackPath: verificationLogPath,
    mode: 'local'
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

module.exports = {
  sendVerificationEmail,
  sendAppointmentRequestEmail,
  sendAppointmentStatusEmail,
  sendAppointmentCancellationEmail,
  verificationLogPath
};
