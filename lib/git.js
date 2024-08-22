const { execSync } = require('child_process');

function sanitizeInput(input) {
  // Remove any characters that aren't alphanumeric, spaces, or common git-safe symbols
  return input.replace(/[^a-zA-Z0-9 .,_\-/]/g, '');
}

function getGitChanges(staged = false) {
  try {
    const command = staged
      ? 'git diff --staged --name-only'
      : 'git ls-files --modified --others --exclude-standard';

    // Sanitize the command before execution
    const sanitizedCommand = sanitizeInput(command);

    return execSync(sanitizedCommand, { encoding: 'utf8', shell: '/bin/bash' })
      .split('\n')
      .filter(Boolean)
      .map((file) => sanitizeInput(file)); // Sanitize each file name
  } catch (error) {
    console.error('Error getting git changes:', error.message);
    return [];
  }
}

module.exports = {
  getGitChanges,
};
