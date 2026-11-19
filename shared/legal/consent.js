const policy = require('./privacy-policy.json');

function validConsentInput(payload) {
  return payload.consentimiento_datos === true && payload.politica_version === policy.version;
}

function consentEvidence(date = new Date()) {
  return { aceptado: true, version: policy.version, sha256: policy.sha256,
    fecha: date.toISOString(), publicidad: false };
}

module.exports = { policy, validConsentInput, consentEvidence };
