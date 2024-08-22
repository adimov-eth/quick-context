const { debug } = require('./utils');

class QContextError extends Error {
  constructor(message, code = 'GENERAL_ERROR') {
    super(message);
    this.name = 'QContextError';
    this.code = code;
  }
}

function handleError(error, customMessage = '') {
  if (error instanceof QContextError) {
    console.error(`${customMessage} ${error.message}`);
    debug(`Error Code: ${error.code}`);
  } else {
    console.error(`${customMessage} An unexpected error occurred: ${error.message}`);
    debug(`Stack Trace: ${error.stack}`);
  }
}

module.exports = {
  QContextError,
  handleError,
};
