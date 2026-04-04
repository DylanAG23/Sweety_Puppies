const {
  formatDateLabel,
  formatStatusLabel,
  formatCurrency
} = require('../../domain/services/appointmentRules');

function renderAppointmentReviewPage({ title, message, appointment, token = '' }) {
  const appointmentCard = appointment
    ? `
      <div style="margin-top:24px; padding:24px; border-radius:24px; background:linear-gradient(145deg, rgba(255,244,250,0.96) 0%, rgba(255,255,255,0.96) 52%, rgba(238,250,255,0.96) 100%); border:1px solid rgba(243,209,230,0.92); text-align:left;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px;">
          <div><strong style="display:block; color:#8f176e;">Cliente</strong><span>${appointment.clientName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Mascota</strong><span>${appointment.petName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Servicio</strong><span>${appointment.serviceName}</span></div>
          <div><strong style="display:block; color:#8f176e;">Fecha</strong><span>${formatDateLabel(appointment.fecha)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Hora</strong><span>${String(appointment.horaInicio).slice(0, 5)} - ${String(appointment.horaFinEstimada).slice(0, 5)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Estado</strong><span>${formatStatusLabel(appointment.estado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Pelaje reportado</strong><span>${formatStatusLabel(appointment.estadoPelajeReportado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Comportamiento</strong><span>${formatStatusLabel(appointment.comportamientoReportado)}</span></div>
          <div><strong style="display:block; color:#8f176e;">Precio estimado</strong><span>${formatCurrency(appointment.precioFinal || appointment.precioCalculado)}</span></div>
        </div>
        <div style="margin-top:18px;">
          <strong style="display:block; color:#8f176e; margin-bottom:8px;">Servicios adicionales</strong>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${
              appointment.additionalServices.length
                ? appointment.additionalServices
                    .map(
                      (item) =>
                        `<span style="display:inline-flex; padding:8px 12px; border-radius:999px; background:#fff3fb; color:#8f176e; font-weight:600;">${item.nombre} - ${formatCurrency(item.precio)}</span>`
                    )
                    .join('')
                : '<span style="display:inline-flex; padding:8px 12px; border-radius:999px; background:#fff3fb; color:#8f176e; font-weight:600;">Sin adicionales</span>'
            }
          </div>
        </div>
        ${
          appointment.observacionesCliente
            ? `<p style="margin:18px 0 0; line-height:1.7;"><strong style="color:#8f176e;">Observaciones del cliente:</strong> ${appointment.observacionesCliente}</p>`
            : ''
        }
      </div>
    `
    : '';

  const actionButtons =
    appointment && appointment.estado === 'pendiente' && token
      ? `
        <form method="POST" action="/api/cliente/citas/admin-review/action" style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:24px;">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" name="decision" value="confirmada" style="border:none; cursor:pointer; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#c1008f 0%,#e95adb 100%); color:#ffffff; font-weight:700;">Confirmar cita</button>
          <button type="submit" name="decision" value="cancelada" style="border:none; cursor:pointer; padding:14px 22px; border-radius:999px; background:linear-gradient(135deg,#63d0e0 0%,#45bdd3 100%); color:#ffffff; font-weight:700;">Cancelar cita</button>
        </form>
      `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sweety Puppies - Revision de cita</title>
      </head>
      <body style="margin:0; background:linear-gradient(180deg,#fff7fb 0%,#fff0f8 100%); font-family:Arial,sans-serif; color:#4b2d40;">
        <main style="max-width:860px; margin:0 auto; padding:36px 18px;">
          <section style="background:rgba(255,255,255,0.96); border-radius:32px; padding:34px; border:1px solid rgba(255,214,235,0.95); box-shadow:0 28px 70px rgba(204,115,174,0.12);">
            <div style="display:inline-flex; padding:8px 14px; border-radius:999px; background:linear-gradient(135deg,#fff1f9 0%,#eefafe 100%); color:#9c0076; font-weight:700; font-size:0.86rem;">Sweety Puppies</div>
            <h1 style="margin:16px 0 10px; color:#8f176e; font-size:2rem;">${title}</h1>
            <p style="margin:0; color:#6e5064; line-height:1.8;">${message}</p>
            ${appointmentCard}
            ${actionButtons}
          </section>
        </main>
      </body>
    </html>
  `;
}

module.exports = { renderAppointmentReviewPage };
