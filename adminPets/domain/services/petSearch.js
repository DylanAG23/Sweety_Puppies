function normalizeSearchTerm(value) {
  return String(value || '').trim();
}

module.exports = {
  normalizeSearchTerm
};
