const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { ensureQctxDir } = require('./file_operations');

const QCTX_DIR = path.join(os.homedir(), '.qctx');
const STATE_FILE = path.join(QCTX_DIR, '.ctx');

async function loadState() {
  try {
    await ensureQctxDir();

    const data = await fs.readFile(STATE_FILE, 'utf8');

    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    if (error instanceof SyntaxError) {
      console.error('Error parsing state file:', error.message);
      return {};
    }
    console.error('Error loading state:', error.message);
    console.error('Error details:', error);
    return {};
  }
}

async function saveState(state) {
  try {
    await ensureQctxDir();
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error.message);
  }
}

async function getCurrentContext() {
  try {
    const state = await loadState();
    const { loadConfig } = require('./config');
    const config = await loadConfig();
    const currentDir = process.cwd();
    return state[currentDir] || config.default || Object.keys(config.contexts)[0];
  } catch (error) {
    console.error('Error getting current context:', error.message);
    return null;
  }
}

async function setCurrentContext(name) {
  try {
    const state = await loadState();
    state[process.cwd()] = name;
    await saveState(state);
  } catch (error) {
    console.error('Error setting current context:', error.message);
  }
}

module.exports = {
  loadState,
  saveState,
  getCurrentContext,
  setCurrentContext,
};
