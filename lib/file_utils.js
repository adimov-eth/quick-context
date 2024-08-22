const fs = require('fs').promises;
const path = require('path');
const anymatch = require('anymatch');
const { QContextError } = require('./error_handler');
const { debug } = require('./utils');

async function getFilesFromPatterns(patterns, excludePatterns = [], dir = process.cwd()) {
  if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
    throw new QContextError('Invalid or empty patterns array', 'INVALID_PATTERNS');
  }

  debug(`Matching files with patterns: ${patterns.join(', ')}`);
  if (excludePatterns.length > 0) {
    debug(`Excluding files with patterns: ${excludePatterns.join(', ')}`);
  }

  const includeMatcher = anymatch(patterns);
  const excludeMatcher = anymatch(excludePatterns);

  let results = [];
  try {
    const list = await fs.readdir(dir);
    await Promise.all(list.map(async (fileName) => {
      const filePath = path.relative(process.cwd(), path.join(dir, fileName));
      const stat = await fs.stat(path.join(dir, fileName));
      if (stat && stat.isDirectory()) {
        const subDirResults = await getFilesFromPatterns(patterns, excludePatterns, path.join(dir, fileName));
        results = results.concat(subDirResults);
      } else if (includeMatcher(filePath) && !excludeMatcher(filePath)) {
        results.push(filePath);
      }
    }));
  } catch (error) {
    throw new QContextError(`Error reading directory ${dir}: ${error.message}`, 'DIR_READ_ERROR');
  }
  debug(`Matched ${results.length} files`);
  return results;
}

async function readFileContent(filePath, maxLines) {
  debug(`Reading file: ${filePath}`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      debug(`File exceeds maxLines (${lines.length} > ${maxLines}), truncating`);
      return `${lines.slice(0, maxLines).join('\n')}\n... (${lines.length - maxLines} more lines)`;
    }
    return content;
  } catch (error) {
    throw new QContextError(`Error reading file ${filePath}: ${error.message}`, 'FILE_READ_ERROR');
  }
}

module.exports = {
  getFilesFromPatterns,
  readFileContent,
};
