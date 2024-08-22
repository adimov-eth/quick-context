const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

const CONFIG_FILE = '.ctx';
const GLOBAL_CONFIG_FILE = path.join(os.homedir(), '.ctx');

function findUpSync(filename, startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const filePath = path.join(currentDir, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

function loadConfig() {
  const localConfig = findUpSync(CONFIG_FILE);
  const globalConfig = GLOBAL_CONFIG_FILE;

  let config = getDefaultConfig();

  if (fs.existsSync(globalConfig)) {
    config = { ...config, ...parseConfig(globalConfig) };
  }

  if (localConfig) {
    config = { ...config, ...parseConfig(localConfig) };
  }

  return config;
}

function parseConfig(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      try {
        return yaml.load(content);
      } catch (yamlError) {
        throw new Error('Invalid configuration file format. Ensure it\'s valid JSON or YAML.');
      }
    }
  } catch (error) {
    console.error(`Error reading config file ${filePath}:`, error.message);
    return {};
  }
}

function getDefaultConfig() {
  return {
    contexts: {
      'git-all': {
        patterns: ['**/*', '!.git/**'],
      },
      'js-only': {
        patterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
      },
      react: {
        patterns: [
          '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx',
          '**/*.json', '**/*.mjs', '**/*.css', '**/*.scss',
          '**/*.less', '**/*.sql', '**/*.html', '**/*.md',
          '!**/node_modules/**', '!**/build/**', '!**/dist/**',
          '!**/out/**', '!**/coverage/**', '!**/.next/**',
          '!**/public/**', '!**/package-lock.json', '!**/yarn.lock',
          '!**/pnpm-lock.yaml', '!**/*.config.js', '!**/*.config.ts',
          '!**/*.min.js', '!**/*.min.css',
        ],
      },
    },
    default: 'react',
    maxLines: 30000,
    warningThreshold: 15000,
  };
}

function saveConfig(config) {
  const configPath = findUpSync(CONFIG_FILE) || GLOBAL_CONFIG_FILE;
  const content = yaml.dump(config);
  fs.writeFileSync(configPath, content, 'utf8');
}

function getAllContexts() {
  return loadConfig().contexts || {};
}

module.exports = {
  loadConfig,
  saveConfig,
  getAllContexts,
  CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
};
