const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

const CONFIG_FILE = '.ctx';
const QCTX_DIR = path.join(os.homedir(), '.qctx');
const GLOBAL_CONFIG_FILE = path.join(QCTX_DIR, '.ctx');

async function ensureQctxDir() {
  try {
    await fs.mkdir(QCTX_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`Failed to create directory ${QCTX_DIR}:`, error.message);
      throw error;
    }
  }
}

async function findUpSync(filename, startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const filePath = path.join(currentDir, filename);
    try {
      fs.accessSync(filePath);
      return filePath;
    } catch (error) {
      currentDir = path.dirname(currentDir);
    }
  }
  return null;
}

async function loadConfig() {
  await ensureQctxDir();
  const localConfig = await findUpSync(CONFIG_FILE);
  const globalConfig = GLOBAL_CONFIG_FILE;

  let config = getDefaultConfig();

  try {
    if (await fileExists(globalConfig)) {
      const parsedGlobalConfig = await parseConfig(globalConfig);
      if (parsedGlobalConfig && typeof parsedGlobalConfig === 'object') {
        config = { ...config, ...parsedGlobalConfig };
      } else {
        console.warn('Global config is empty or invalid. Using default config.');
      }
    } else {
      console.log('Global config does not exist. Creating a new one with default settings.');
      await saveConfig(config);
    }

    if (localConfig) {
      const parsedLocalConfig = await parseConfig(localConfig);
      if (parsedLocalConfig && typeof parsedLocalConfig === 'object') {
        config = { ...config, ...parsedLocalConfig };
      } else {
        console.warn('Local config is empty or invalid. Using global or default config.');
      }
    }
  } catch (error) {
    console.error('Error loading config:', error.message);
  }

  return config;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function saveContextToFile(contextName, content) {
  await ensureQctxDir();
  const filename = `${contextName}.txt`;
  const filePath = path.join(QCTX_DIR, filename);

  await fs.writeFile(filePath, content, 'utf8');
  console.log(`Context saved to file: ${filePath}`);
  return filePath;
}

async function parseConfig(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.trim()) {
      console.warn(`Config file ${filePath} is empty.`);
      return null;
    }
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      try {
        return yaml.load(content);
      } catch (yamlError) {
        throw new Error(`Invalid configuration file format in ${filePath}. Ensure it's valid JSON or YAML.`);
      }
    }
  } catch (error) {
    console.error(`Error reading or parsing config file ${filePath}:`, error.message);
    return null;
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
    cleanup: {
      enabled: true,
      maxAge: 7, // days
      maxFiles: 100,
    },
  };
}

async function saveConfig(config) {
  const configPath = await findUpSync(CONFIG_FILE) || GLOBAL_CONFIG_FILE;
  const content = yaml.dump(config);
  await fs.writeFile(configPath, content, 'utf8');
}

async function getAllContexts() {
  const config = await loadConfig();
  return config.contexts || {};
}

module.exports = {
  loadConfig,
  saveConfig,
  getAllContexts,
  saveContextToFile,
  CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
};
