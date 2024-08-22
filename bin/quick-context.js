#!/usr/bin/env node

const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const clipboardy = require('clipboardy');
const anymatch = require('anymatch');
const readline = require('readline');

const {
  loadConfig, saveConfig, getAllContexts, CONFIG_FILE, GLOBAL_CONFIG_FILE,
} = require('../lib/config');
const { getCurrentContext, setCurrentContext } = require('../lib/state');
const { getGitChanges } = require('../lib/git');

const DEBUG = process.env.DEBUG === 'true';

function debug(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

function getFilesFromPatterns(patterns, dir = process.cwd()) {
  if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
    console.error('Error: Invalid or empty patterns array');
    return [];
  }

  debug(`Matching files with patterns: ${patterns.join(', ')}`);
  const matcher = anymatch(patterns);
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach((fileName) => {
      const filePath = path.relative(process.cwd(), path.join(dir, fileName));
      const stat = fs.statSync(path.join(dir, fileName));
      if (stat && stat.isDirectory()) {
        results = results.concat(getFilesFromPatterns(patterns, path.join(dir, fileName)));
      } else if (matcher(filePath)) {
        results.push(filePath);
      }
    });
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  debug(`Matched ${results.length} files`);
  return results;
}

function readFileContent(filePath, maxLines) {
  debug(`Reading file: ${filePath}`);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      debug(`File exceeds maxLines (${lines.length} > ${maxLines}), truncating`);
      return `${lines.slice(0, maxLines).join('\n')}\n... (${lines.length - maxLines} more lines)`;
    }
    return content;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return '';
  }
}

function updateContext(name, patterns, options = {}) {
  debug(`Updating context: ${name}`);
  const config = loadConfig();
  config.contexts[name] = {
    patterns,
    ...options,
  };
  saveConfig(config);
  setCurrentContext(name);
  console.log(`Context '${name}' updated and set as current.`);
}

function deleteContext(name) {
  debug(`Deleting context: ${name}`);
  const config = loadConfig();
  if (config.contexts[name]) {
    delete config.contexts[name];
    saveConfig(config);
    console.log(`Context '${name}' deleted.`);
    if (getCurrentContext() === name) {
      setCurrentContext(config.default || Object.keys(config.contexts)[0]);
    }
  } else {
    console.error(`Context '${name}' not found.`);
  }
}

function initializeConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Do you want to create a global or local configuration? (global/local): ', (answer) => {
      const isGlobal = answer.toLowerCase() === 'global';
      const configPath = isGlobal ? GLOBAL_CONFIG_FILE : path.join(process.cwd(), CONFIG_FILE);
      rl.question('Enter a name for your first context: ', (contextName) => {
        if (!contextName.trim()) {
          console.error('Error: Context name cannot be empty.');
          rl.close();
          process.exit(1);
        }
        rl.question('Enter file patterns for this context (comma-separated): ', (patterns) => {
          const patternList = patterns.split(',').map((p) => p.trim()).filter(Boolean);
          if (patternList.length === 0) {
            console.error('Error: At least one pattern is required.');
            rl.close();
            process.exit(1);
          }
          const config = {
            contexts: {
              [contextName]: { patterns: patternList },
            },
            default: contextName,
          };
          try {
            saveConfig(config);
            console.log(`Configuration created at ${configPath}`);
            rl.close();
            resolve(contextName);
          } catch (error) {
            console.error('Error creating configuration:', error.message);
            rl.close();
            process.exit(1);
          }
        });
      });
    });
  });
}

const yargsInstance = yargs
  .command(['init', 'i'], 'Initialize the configuration', {}, async () => {
    try {
      const contextName = await initializeConfig();
      setCurrentContext(contextName);
      console.log(`Initialized with context: ${contextName}`);
    } catch (error) {
      console.error('Error during initialization:', error.message);
      process.exit(1);
    }
  })
  .command(['update <name> [patterns..]', 'up <name> [patterns..]'], 'Create or update a context', {
    maxLines: {
      describe: 'Maximum number of lines to include in the context',
      type: 'number',
    },
    warningThreshold: {
      describe: 'Number of lines at which to show a warning',
      type: 'number',
    },
  }, (argv) => {
    updateContext(argv.name, argv.patterns, {
      maxLines: argv.maxLines,
      warningThreshold: argv.warningThreshold,
    });
  })
  .command(['switch <name>', 's <name>'], 'Switch to an existing context', {}, (argv) => {
    const config = loadConfig();
    if (config.contexts[argv.name]) {
      setCurrentContext(argv.name);
      console.log(`Switched to context '${argv.name}'.`);
    } else {
      console.error(`Context '${argv.name}' not found.`);
    }
  })
  .command(['list', 'l'], 'List all available contexts', {}, () => {
    const contexts = getAllContexts();
    const currentContext = getCurrentContext();
    console.log('Available contexts:');
    Object.keys(contexts).forEach((name) => {
      const marker = name === currentContext ? '* ' : '  ';
      console.log(`${marker}${name}`);
    });
  })
  .command(['git-changes <name>', 'git <name>'], 'Create a context from unstaged git changes', {}, (argv) => {
    const files = getGitChanges(false);
    updateContext(argv.name, files.map((file) => `**/${file}`));
  })
  .command(['git-staged <name>', 'staged <name>'], 'Create a context from staged git changes', {}, (argv) => {
    const files = getGitChanges(true);
    updateContext(argv.name, files.map((file) => `**/${file}`));
  })
  .command(['set-default <name>', 'default <name>'], 'Set the default context', {}, (argv) => {
    const config = loadConfig();
    if (config.contexts[argv.name]) {
      config.default = argv.name;
      saveConfig(config);
      console.log(`Default context set to '${argv.name}'.`);
    } else {
      console.error(`Context '${argv.name}' not found.`);
    }
  })
  .command(['delete <name>', 'd <name>'], 'Delete an existing context', {}, (argv) => {
    deleteContext(argv.name);
  })
  .command('$0 [context]', 'Load context to clipboard', {}, (argv) => {
    const contextName = argv.context || getCurrentContext();
    const config = loadConfig();
    const context = config.contexts[contextName];
    if (context && Array.isArray(context.patterns)) {
      debug(`Loading context: ${contextName}`);
      const files = getFilesFromPatterns(context.patterns);
      let contextContent = `Context: ${contextName}\n\n`;
      let totalLines = 0;
      const maxLines = context.maxLines || config.maxLines || 30000;
      const warningThreshold = context.warningThreshold || config.warningThreshold || 15000;

      files.every((file) => {
        const content = readFileContent(file, maxLines - totalLines);
        const lines = content.split('\n').length;
        if (totalLines + lines > maxLines) {
          console.warn('Reached line limit. Some files may be omitted.');
          return false;
        }
        contextContent += `--- ${file} ---\n\n${content}\n\n`;
        totalLines += lines;
        return true;
      });

      try {
        clipboardy.writeSync(contextContent);
        console.log(`Context '${contextName}' with ${files.length} files loaded to clipboard.`);
        console.log(`Total lines: ${totalLines}`);
        if (totalLines > warningThreshold) {
          console.warn(`Warning: Large context (${totalLines} lines). This may impact performance.`);
        }
      } catch (error) {
        console.error('Error writing to clipboard:', error.message);
      }
    } else {
      console.error(`Context '${contextName}' not found or has invalid patterns.`);
    }
  })
  .help('h')
  .alias('h', 'help');

yargsInstance.parse();