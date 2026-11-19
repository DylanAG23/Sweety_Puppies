const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// Escapa texto para insertarlo en HTML (contenido o atributos entre comillas).
function escapeHtml(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

// Devuelve una copia del objeto con sus campos de texto escapados (un nivel,
// mas los arreglos de objetos como los servicios adicionales).
function escapeHtmlFields(source) {
  const escaped = {};

  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value === 'string') {
      escaped[key] = escapeHtml(value);
    } else if (Array.isArray(value)) {
      escaped[key] = value.map((item) => (item && typeof item === 'object' ? escapeHtmlFields(item) : item));
    } else {
      escaped[key] = value;
    }
  }

  return escaped;
}

module.exports = { escapeHtml, escapeHtmlFields };
