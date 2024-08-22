const fs = require('fs').promises;
const { loadConfig } = require('./config');
const { ensureQctxDir } = require('./file_operations');
const { STATE_FILE } = require('./constants');

async function loadState() {
  try {
    await ensureQctxDir();
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('State file does not exist. Creating a new one.');
        await saveState({});
        return {};
      }
      if (error instanceof SyntaxError) {
        console.error('Error parsing state JSON:', error.message);
        console.log('Resetting state file due to invalid JSON');
        await saveState({});
        return {};
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading state:', error.message);
    return {};
  }
}

async function saveState(state) {
  try {
    await ensureQctxDir();
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving state:', error.message);
  }
}

async function getCurrentContext() {
  try {
    const state = await loadState();
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
