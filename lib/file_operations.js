const fs = require('fs').promises;
const path = require('path');
const { QCTX_DIR } = require('./constants');
const { debug } = require('./utils');
const { QContextError, handleError } = require('./error_handler');

async function ensureQctxDir() {
  try {
    await fs.mkdir(QCTX_DIR, { recursive: true });
    debug(`Ensured ${QCTX_DIR} directory exists`);
  } catch (error) {
    throw new QContextError(`Failed to create directory ${QCTX_DIR}: ${error.message}`, 'DIR_CREATE_ERROR');
  }
}

async function saveContextToFile(contextName, content) {
  try {
    await ensureQctxDir();
    const filename = `${contextName}.txt`;
    const filePath = path.join(QCTX_DIR, filename);
    await fs.writeFile(filePath, content, 'utf8');
    debug(`Context saved to file: ${filePath}`);
    return filePath;
  } catch (error) {
    throw new QContextError(`Failed to save context file: ${error.message}`, 'FILE_SAVE_ERROR');
  }
}

async function cleanupOldFiles(config, dryRun = false) {
  if (!config.cleanup.enabled) {
    debug('Cleanup is disabled, skipping');
    return { deletedCount: 0, freedSpace: 0 };
  }

  try {
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

    fileStats.sort((a, b) => b.mtime - a.mtime);

    const filesToDelete = fileStats.filter(
      ({ mtime }, index) => index >= config.cleanup.maxFiles || now - mtime > maxAge,
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
            handleError(err, `Failed to delete file ${file}:`);
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
  } catch (error) {
    throw new QContextError(`Error during cleanup: ${error.message}`, 'CLEANUP_ERROR');
  }
}

module.exports = {
  ensureQctxDir,
  saveContextToFile,
  cleanupOldFiles,
};
