const { createAuthModule } = require('../auth');

const { useCases } = createAuthModule();

module.exports = useCases;
