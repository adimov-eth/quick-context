const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const QCTX_DIR = path.join(os.homedir(), '.qctx');

async function ensureQctxDir() {
  try {
    await fs.mkdir(QCTX_DIR, { recursive: true });
    debug(`Ensured ${QCTX_DIR} directory exists`);
  } catch (error) {
    throw new Error(`Failed to create directory ${QCTX_DIR}: ${error.message}`);
  }
}

async function saveContextToFile(contextName, content) {
  await ensureQctxDir();
  const filename = `${contextName}.txt`;
  const filePath = path.join(QCTX_DIR, filename);

  try {
    await fs.writeFile(filePath, content, 'utf8');
    debug(`Context saved to file: ${filePath}`);
    return filePath;
  } catch (error) {
    if (error.code === 'ENOSPC') {
      throw new Error('Insufficient disk space to save context file');
    } else if (error.code === 'EACCES') {
      throw new Error('Permission denied when trying to save context file');
    } else {
      throw new Error(`Failed to save context file: ${error.message}`);
    }
  }
}

async function cleanupOldFiles(config, dryRun = false) {
  if (!config.cleanup.enabled) {
    debug('Cleanup is disabled, skipping');
    return { deletedCount: 0, freedSpace: 0 };
  }

  debug('Starting cleanup of old context files');
  const files = await fs.readdir(QCTX_DIR);
  const contextFiles = files.filter((file) => file.endsWith('.txt'));

  const now = new Date();
  const maxAge = config.cleanup.maxAge * 24 * 60 * 60 * 1000; // convert days to milliseconds

  const fileStats = await Promise.all(
    contextFiles.map(async (file) => {
      const filePath = path.join(QCTX_DIR, file);
      const stats = await fs.stat(filePath);
      return {
        file, filePath, mtime: stats.mtime, size: stats.size,
      };
    }),
  );

  // Sort files by modification time (newest first)
  fileStats.sort((a, b) => b.mtime - a.mtime);

  const filesToDelete = fileStats.filter(
    ({ mtime }, index) => index >= config.cleanup.maxFiles || (now - mtime > maxAge),
  );

  let deletedCount = 0;
  let freedSpace = 0;

  if (!dryRun) {
    await Promise.all(
      filesToDelete.map(async ({ file, filePath, size }) => {
        try {
          await fs.unlink(filePath);
          debug(`Deleted old context file: ${file}`);
          deletedCount += 1;
          freedSpace += size;
        } catch (err) {
          console.error(`Failed to delete file ${file}: ${err.message}`);
        }
      }),
    );
  } else {
    deletedCount = filesToDelete.length;
    freedSpace = filesToDelete.reduce((total, { size }) => total + size, 0);
    debug(`Dry run: Would delete ${deletedCount} files, freeing ${freedSpace} bytes`);
  }

  debug('Cleanup completed');
  return { deletedCount, freedSpace };
}

function debug(message) {
  if (process.env.DEBUG === 'true') {
    console.log(`[DEBUG] ${message}`);
  }
}

module.exports = {
  ensureQctxDir,
  saveContextToFile,
  cleanupOldFiles,
  debug,
};
