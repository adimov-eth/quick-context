const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = path.join(os.homedir(), '.qctx');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
    return {};
  } catch (error) {
    console.error('Error loading state:', error.message);
    return {};
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error.message);
  }
}

function getCurrentContext() {
  const state = loadState();
  const config = require('./config').loadConfig();
  const currentDir = process.cwd();
  return state[currentDir] || config.default || Object.keys(config.contexts)[0];
}

function setCurrentContext(name) {
  const state = loadState();
  state[process.cwd()] = name;
  saveState(state);
}

module.exports = {
  loadState,
  saveState,
  getCurrentContext,
  setCurrentContext,
};
