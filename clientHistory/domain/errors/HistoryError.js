class HistoryError extends Error {
  constructor(message, status = 400, code = 'HISTORY_ERROR') {
    super(message);
    this.name = 'HistoryError';
    this.status = status;
    this.code = code;
  }
}

module.exports = { HistoryError };
