const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

function findUpSync(filename, startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const filePath = path.join(currentDir, filename);
    if (fsSync.existsSync(filePath)) {
      return filePath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function debug(message) {
  if (process.env.DEBUG === 'true') {
    console.log(`[DEBUG] ${message}`);
  }
}

module.exports = {
  findUpSync,
  fileExists,
  debug,
};
