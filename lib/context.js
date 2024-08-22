const fs = require('fs');
const path = require('path');
const os = require('os');

const QCTX_DIR = path.join(os.homedir(), '.qctx');
const STATE_FILE = path.join(QCTX_DIR, '.ctx');

async function ensureQctxDir() {
  try {
    await fs.mkdir(QCTX_DIR, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to create directory ${QCTX_DIR}: ${error.message}`);
  }
}

async function loadState() {
  try {
    await ensureQctxDir();
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // State file doesn't exist yet, return an empty state
      return {};
    }
    console.error('Error loading state:', error.message);
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
  const state = await loadState();
  const config = require('./config').loadConfig();
  const currentDir = process.cwd();
  return state[currentDir] || config.default || Object.keys(config.contexts)[0];
}

async function setCurrentContext(name) {
  const state = await loadState();
  state[process.cwd()] = name;
  await saveState(state);
}

// function saveState(state) {
//   try {
//     fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
//   } catch (error) {
//     console.error('Error saving state:', error.message);
//   }
// }

// function getCurrentContext() {
//   const state = loadState();
//   const config = require('./config').loadConfig();
//   const currentDir = process.cwd();
//   return state[currentDir] || config.default || Object.keys(config.contexts)[0];
// }

// function setCurrentContext(name) {
//   const state = loadState();
//   state[process.cwd()] = name;
//   saveState(state);
// }

module.exports = {
  loadState,
  saveState,
  getCurrentContext,
  setCurrentContext,
};
