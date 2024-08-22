#!/usr/bin/env node

const yargs = require('yargs');
const path = require('path');
const fs = require('fs').promises;
const clipboardy = require('clipboardy');
const anymatch = require('anymatch');
const readline = require('readline');

const { saveContextToFile, cleanupOldFiles, debug } = require('../lib/file_operations');
const {
  loadConfig, saveConfig, getAllContexts, CONFIG_FILE, GLOBAL_CONFIG_FILE,
} = require('../lib/config');
const {
  getCurrentContext, setCurrentContext, addToContext, removeFromContext,
} = require('../lib/state');
const { getGitChanges } = require('../lib/git');

async function getFilesFromPatterns(patterns, excludePatterns = [], dir = process.cwd()) {
  if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
    console.error('Error: Invalid or empty patterns array');
    return [];
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
    console.error(`Error reading directory ${dir}:`, error.message);
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
    console.error(`Error reading file ${filePath}:`, error.message);
    return '';
  }
}

async function updateContext(name, patterns, options = {}) {
  try {
    debug(`Updating context: ${name}`);
    const config = await loadConfig();
    config.contexts[name] = {
      patterns,
      ...options,
    };
    await saveConfig(config);
    await setCurrentContext(name);
    console.log(`Context '${name}' updated and set as current.`);
  } catch (error) {
    console.error(`Error updating context '${name}':`, error.message);
  }
}

async function deleteContext(name) {
  try {
    debug(`Deleting context: ${name}`);
    const config = await loadConfig();
    if (config.contexts[name]) {
      delete config.contexts[name];
      await saveConfig(config);
      console.log(`Context '${name}' deleted.`);
      if (await getCurrentContext() === name) {
        await setCurrentContext(config.default || Object.keys(config.contexts)[0]);
      }
    } else {
      console.error(`Context '${name}' not found.`);
    }
  } catch (error) {
    console.error(`Error deleting context '${name}':`, error.message);
  }
}

async function initializeConfig() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });

  try {
    const answer = await question('Do you want to create a global or local configuration? (global/local): ');
    const isGlobal = answer.toLowerCase() === 'global';
    const configPath = isGlobal ? GLOBAL_CONFIG_FILE : path.join(process.cwd(), CONFIG_FILE);

    const contextName = await question('Enter a name for your first context: ');
    if (!contextName.trim()) {
      throw new Error('Context name cannot be empty.');
    }

    const patterns = await question('Enter file patterns for this context (comma-separated): ');
    const patternList = patterns.split(',').map((p) => p.trim()).filter(Boolean);
    if (patternList.length === 0) {
      throw new Error('At least one pattern is required.');
    }

    const config = {
      contexts: {
        [contextName]: { patterns: patternList },
      },
      default: contextName,
    };

    await saveConfig(config);
    console.log(`Configuration created at ${configPath}`);
    return contextName;
  } catch (error) {
    console.error('Error creating configuration:', error.message);
    return null; // Return null in case of error
  } finally {
    rl.close();
  }
}

async function getContextPatterns(contextName, config, visitedContexts = new Set()) {
  debug(`Getting patterns for context: ${contextName}`);
  if (visitedContexts.has(contextName)) {
    console.error(`Circular dependency detected in context: ${contextName}`);
    return { patterns: [], exclude: [] };
  }
  visitedContexts.add(contextName);

  const context = config.contexts[contextName];
  if (!context) {
    console.error(`Context not found: ${contextName}`);
    return { patterns: [], exclude: [] };
  }

  let patterns = [...(context.patterns || [])];
  let exclude = [...(context.exclude || [])];

  debug(`Base patterns: ${patterns.join(', ')}`);
  debug(`Base exclude patterns: ${exclude.join(', ')}`);

  if (context.include) {
    debug(`Including contexts: ${context.include.join(', ')}`);
    const includedContextsResults = await Promise.all(
      // eslint-disable-next-line max-len
      context.include.map((includedContextName) => getContextPatterns(includedContextName, config, new Set(visitedContexts))),
    );

    patterns = [
      ...patterns,
      ...includedContextsResults.flatMap((result) => result.patterns),
    ];
    exclude = [
      ...exclude,
      ...includedContextsResults.flatMap((result) => result.exclude),
    ];
  }

  debug(`Final patterns: ${patterns.join(', ')}`);
  debug(`Final exclude patterns: ${exclude.join(', ')}`);

  return { patterns, exclude };
}

const yargsInstance = yargs
  .command(['init', 'i'], 'Initialize the configuration', {}, async () => {
    try {
      const contextName = await initializeConfig();
      await setCurrentContext(contextName);
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
  }, async (argv) => {
    try {
      await updateContext(argv.name, argv.patterns, {
        maxLines: argv.maxLines,
        warningThreshold: argv.warningThreshold,
      });
    } catch (error) {
      console.error('Error updating context:', error.message);
    }
  })
  .command(['switch <name>', 's <name>'], 'Switch to an existing context', {}, async (argv) => {
    try {
      const config = await loadConfig();
      if (config.contexts[argv.name]) {
        await setCurrentContext(argv.name);
        console.log(`Switched to context '${argv.name}'.`);
      } else {
        console.error(`Context '${argv.name}' not found.`);
      }
    } catch (error) {
      console.error('Error switching context:', error.message);
    }
  })
  .command(['list', 'l'], 'List all available contexts', {}, async () => {
    try {
      const contexts = await getAllContexts();
      const currentContext = await getCurrentContext();
      console.log('Available contexts:');
      Object.keys(contexts).forEach((name) => {
        const marker = name === currentContext ? '* ' : '  ';
        console.log(`${marker}${name}`);
      });
    } catch (error) {
      console.error('Error listing contexts:', error.message);
    }
  })
  .command(['git-changes <name>', 'git <name>'], 'Create a context from unstaged git changes', {}, async (argv) => {
    try {
      const files = await getGitChanges(false);
      await updateContext(argv.name, files.map((file) => `**/${file}`));
    } catch (error) {
      console.error('Error creating context from git changes:', error.message);
    }
  })
  .command(['git-staged <name>', 'staged <name>'], 'Create a context from staged git changes', {}, async (argv) => {
    try {
      const files = await getGitChanges(true);
      await updateContext(argv.name, files.map((file) => `**/${file}`));
    } catch (error) {
      console.error('Error creating context from staged git changes:', error.message);
    }
  })
  .command(['set-default <name>', 'default <name>'], 'Set the default context', {}, async (argv) => {
    try {
      const config = await loadConfig();
      if (config.contexts[argv.name]) {
        config.default = argv.name;
        await saveConfig(config);
        console.log(`Default context set to '${argv.name}'.`);
      } else {
        console.error(`Context '${argv.name}' not found.`);
      }
    } catch (error) {
      console.error('Error setting default context:', error.message);
    }
  })
  .command(['delete <name>', 'd <name>'], 'Delete an existing context', {}, async (argv) => {
    try {
      await deleteContext(argv.name);
    } catch (error) {
      console.error('Error deleting context:', error.message);
    }
  })
  .command(['add <context> <item>', 'a <context> <item>'], 'Add an item to a context', {}, async (argv) => {
    try {
      await addToContext(argv.context, argv.item);
    } catch (error) {
      console.error('Error adding item to context:', error.message);
    }
  })
  .command(['remove <context> <item>', 'r <context> <item>'], 'Remove an item from a context', {}, async (argv) => {
    try {
      await removeFromContext(argv.context, argv.item);
    } catch (error) {
      console.error('Error removing item from context:', error.message);
    }
  })
  .command('$0 [context]', 'Load context to clipboard', {}, async (argv) => {
    try {
      const contextName = argv.context || await getCurrentContext();
      if (!contextName) {
        console.error('No context specified and no current context found.');
        return;
      }
      const config = await loadConfig();
      if (!config || !config.contexts) {
        console.error('Invalid configuration. Please run "q init" to set up your configuration.');
        return;
      }
      const context = config.contexts[contextName];
      if (context) {
        debug(`Loading context: ${contextName}`);
        const { patterns, exclude } = await getContextPatterns(contextName, config);
        const files = await getFilesFromPatterns(patterns, exclude);
        let contextContent = `Context: ${contextName}\n`;
        if (context.description) {
          contextContent += `Description: ${context.description}\n`;
        }
        contextContent += '\n';
        let totalLines = 0;
        const maxLines = context.maxLines || config.maxLines || 30000;
        const warningThreshold = context.warningThreshold || config.warningThreshold || 15000;

        await files.reduce(async (previousPromise, file) => {
          await previousPromise;
          if (totalLines >= maxLines) {
            return;
          }
          const content = await readFileContent(file, maxLines - totalLines);
          const lines = content.split('\n').length;
          if (totalLines + lines > maxLines) {
            console.warn('Reached line limit. Some files may be omitted.');
            return;
          }
          contextContent += `--- ${file} ---\n\n${content}\n\n`;
          totalLines += lines;
        }, Promise.resolve());

        try {
          clipboardy.writeSync(contextContent);
          debug(`Context '${contextName}' with ${files.length} files loaded to clipboard.`);
        } catch (error) {
          console.error('Error writing to clipboard:', error.message);
        }
        debug(`Context '${contextName}' with ${files.length} files loaded to clipboard.`);

        const savedFilePath = await saveContextToFile(contextName, contextContent);
        console.log(`Context saved to: ${savedFilePath}`);

        await cleanupOldFiles(config);

        console.log(`Total lines: ${totalLines}`);
        if (totalLines > warningThreshold) {
          console.warn(`Warning: Large context (${totalLines} lines). This may impact performance.`);
        }
      } else {
        console.error(`Context '${contextName}' not found.`);
      }
    } catch (error) {
      console.error('Error1:', error.message);
    }
  })
  .help('h')
  .alias('h', 'help');

yargsInstance.parse();
