const fs = require('fs').promises;
const yaml = require('js-yaml');
const {
  CONFIG_FILE,
  GLOBAL_CONFIG_FILE,
} = require('./constants');
const {
  findUpSync,
  fileExists,
  debug,
} = require('./utils');
const { QContextError, handleError } = require('./error_handler');

async function loadConfig() {
  try {
    const localConfig = await findUpSync(CONFIG_FILE);
    const globalConfig = GLOBAL_CONFIG_FILE;

    let config = getDefaultConfig();

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

    return config;
  } catch (error) {
    handleError(error, 'Error loading config:');
    return getDefaultConfig();
  }
}

async function parseConfig(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.trim()) {
      throw new QContextError(`Config file ${filePath} is empty.`, 'EMPTY_CONFIG_ERROR');
    }
    try {
      return JSON.parse(content);
    } catch (jsonError) {
      try {
        return yaml.load(content);
      } catch (yamlError) {
        throw new QContextError(
          `Invalid configuration file format in ${filePath}. Ensure it's valid JSON or YAML.`,
          'INVALID_CONFIG_FORMAT',
        );
      }
    }
  } catch (error) {
    if (error instanceof QContextError) {
      throw error;
    } else {
      throw new QContextError(
        `Error reading or parsing config file ${filePath}: ${error.message}`,
        'CONFIG_READ_ERROR',
      );
    }
  }
}

async function saveConfig(config) {
  const configPath = await findUpSync(CONFIG_FILE) || GLOBAL_CONFIG_FILE;
  const content = yaml.dump(config);
  try {
    await fs.writeFile(configPath, content, 'utf8');
    debug(`Config saved to ${configPath}`);
  } catch (error) {
    throw new QContextError(`Failed to save config to ${configPath}: ${error.message}`, 'CONFIG_SAVE_ERROR');
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

async function getAllContexts() {
  try {
    const config = await loadConfig();
    return config.contexts || {};
  } catch (error) {
    handleError(error, 'Error getting all contexts:');
    return {};
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  getAllContexts,
};
