const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, saveConfig } = require('./config');

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
  const config = loadConfig();
  const currentDir = process.cwd();
  return state[currentDir] || config.default || Object.keys(config.contexts)[0];
}

function setCurrentContext(name) {
  const state = loadState();
  state[process.cwd()] = name;
  saveState(state);
}

function updateContext(name, patterns, options = {}) {
  const config = loadConfig();
  config.contexts[name] = {
    patterns,
    ...options,
  };
  saveConfig(config);
  console.log(`Context '${name}' updated successfully.`);
}

function deleteContext(name) {
  const config = loadConfig();
  if (config.contexts[name]) {
    delete config.contexts[name];
    saveConfig(config);
    console.log(`Context '${name}' deleted successfully.`);

    if (config.default === name) {
      const newDefault = Object.keys(config.contexts)[0];
      config.default = newDefault;
      saveConfig(config);
      console.log(`Default context changed to '${newDefault}'.`);
    }

    const state = loadState();
    Object.keys(state).forEach((dir) => {
      if (state[dir] === name) {
        delete state[dir];
      }
    });
    saveState(state);
  } else {
    console.error(`Context '${name}' not found.`);
  }
}

module.exports = {
  loadState,
  saveState,
  getCurrentContext,
  setCurrentContext,
  updateContext,
  deleteContext,
};
