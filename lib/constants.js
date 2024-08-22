const path = require('path');
const os = require('os');

const QCTX_DIR = path.join(os.homedir(), '.qctx');
const CONFIG_FILE = '.ctx';
const GLOBAL_CONFIG_FILE = path.join(QCTX_DIR, '.ctx');
const STATE_FILE = path.join(QCTX_DIR, 'state.json');

module.exports = {
  QCTX_DIR,
  CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
  STATE_FILE,
};
