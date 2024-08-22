const path = require('path');
const clipboardy = require('clipboardy');
const { loadConfig, saveConfig, getAllContexts } = require('./config');
const { getCurrentContext, setCurrentContext } = require('./state');
const { getFilesFromPatterns, readFileContent } = require('./file_utils');
const { saveContextToFile, cleanupOldFiles } = require('./file_operations');
const { getGitChanges } = require('./git');
const { QContextError } = require('./error_handler');
const { debug } = require('./utils');
const { GLOBAL_CONFIG_FILE, CONFIG_FILE } = require('./constants');

async function handleInit() {
  const rl = require('readline').createInterface({
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
      throw new QContextError('Context name cannot be empty.', 'EMPTY_CONTEXT_NAME');
    }

    const patterns = await question('Enter file patterns for this context (comma-separated): ');
    const patternList = patterns.split(',').map((p) => p.trim()).filter(Boolean);
    if (patternList.length === 0) {
      throw new QContextError('At least one pattern is required.', 'NO_PATTERNS');
    }

    const config = {
      contexts: {
        [contextName]: { patterns: patternList },
      },
      default: contextName,
    };

    await saveConfig(config);
    console.log(`Configuration created at ${configPath}`);
    await setCurrentContext(contextName);
    console.log(`Initialized with context: ${contextName}`);
  } finally {
    rl.close();
  }
}

async function handleUpdate(name, patterns, options = {}) {
  debug(`Updating context: ${name}`);
  const config = await loadConfig();
  config.contexts[name] = {
    patterns,
    ...options,
  };
  await saveConfig(config);
  await setCurrentContext(name);
  console.log(`Context '${name}' updated and set as current.`);
}

async function handleSwitch(name) {
  const config = await loadConfig();
  if (config.contexts[name]) {
    await setCurrentContext(name);
    console.log(`Switched to context '${name}'.`);
  } else {
    throw new QContextError(`Context '${name}' not found.`, 'CONTEXT_NOT_FOUND');
  }
}

async function handleList() {
  const contexts = await getAllContexts();
  const currentContext = await getCurrentContext();
  console.log('Available contexts:');
  Object.keys(contexts).forEach((name) => {
    const marker = name === currentContext ? '* ' : '  ';
    console.log(`${marker}${name}`);
  });
}

async function handleGitChanges(name, staged = false) {
  const files = await getGitChanges(staged);
  await handleUpdate(name, files.map((file) => `**/${file}`));
}

async function handleSetDefault(name) {
  const config = await loadConfig();
  if (config.contexts[name]) {
    config.default = name;
    await saveConfig(config);
    console.log(`Default context set to '${name}'.`);
  } else {
    throw new QContextError(`Context '${name}' not found.`, 'CONTEXT_NOT_FOUND');
  }
}

async function handleDelete(name) {
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
    throw new QContextError(`Context '${name}' not found.`, 'CONTEXT_NOT_FOUND');
  }
}

async function handleAdd(context, item) {
  const config = await loadConfig();
  if (!config.contexts[context]) {
    throw new QContextError(`Context '${context}' does not exist.`, 'CONTEXT_NOT_FOUND');
  }

  const ctx = config.contexts[context];

  if (item.startsWith('!')) {
    ctx.exclude = ctx.exclude || [];
    if (!ctx.exclude.includes(item)) {
      ctx.exclude.push(item);
    }
  } else if (item.includes('*') || item.includes('/')) {
    ctx.patterns = ctx.patterns || [];
    if (!ctx.patterns.includes(item)) {
      ctx.patterns.push(item);
    }
  } else if (config.contexts[item]) {
    ctx.include = ctx.include || [];
    if (!ctx.include.includes(item)) {
      ctx.include.push(item);
    }
  } else {
    ctx.patterns = ctx.patterns || [];
    if (!ctx.patterns.includes(item)) {
      ctx.patterns.push(item);
    }
  }

  await saveConfig(config);
  console.log(`Added '${item}' to context '${context}'.`);
}

async function handleRemove(context, item) {
  const config = await loadConfig();
  if (!config.contexts[context]) {
    throw new QContextError(`Context '${context}' does not exist.`, 'CONTEXT_NOT_FOUND');
  }

  const ctx = config.contexts[context];
  let removed = false;

  if (ctx.exclude && ctx.exclude.includes(item)) {
    ctx.exclude = ctx.exclude.filter((i) => i !== item);
    removed = true;
  }
  if (ctx.patterns && ctx.patterns.includes(item)) {
    ctx.patterns = ctx.patterns.filter((i) => i !== item);
    removed = true;
  }
  if (ctx.include && ctx.include.includes(item)) {
    ctx.include = ctx.include.filter((i) => i !== item);
    removed = true;
  }

  if (removed) {
    await saveConfig(config);
    console.log(`Removed '${item}' from context '${context}'.`);
  } else {
    console.log(`'${item}' not found in context '${context}'.`);
  }
}

async function handleMain(inputContextName) {
  const config = await loadConfig();
  if (!config || !config.contexts) {
    throw new QContextError(
      'Invalid configuration. Please run "q init" to set up your configuration.',
      'INVALID_CONFIG',
    );
  }

  let contextName = inputContextName;
  if (!contextName) {
    contextName = await getCurrentContext();
    if (!contextName) {
      throw new QContextError('No context specified and no current context found.', 'NO_CONTEXT');
    }
  }

  const context = config.contexts[contextName];
  if (!context) {
    throw new QContextError(`Context '${contextName}' not found.`, 'CONTEXT_NOT_FOUND');
  }

  debug(`Loading context: ${contextName}`);
  const { patterns, exclude } = await getContextPatterns(contextName, config);
  const files = await getFilesFromPatterns(patterns, exclude);

  let contextContent = `Context: ${contextName}\n`;
  if (context.description) {
    contextContent += `Description: ${context.description}\n`;
  }
  contextContent += '\n';

  const { content, totalLines } = await generateContextContent(files, context, config);
  contextContent += content;

  try {
    clipboardy.writeSync(contextContent);
    debug(`Context '${contextName}' with ${files.length} files loaded to clipboard.`);
  } catch (error) {
    throw new QContextError(`Error writing to clipboard: ${error.message}`, 'CLIPBOARD_ERROR');
  }

  const savedFilePath = await saveContextToFile(contextName, contextContent);
  console.log(`Context saved to: ${savedFilePath}`);

  await cleanupOldFiles(config);

  console.log(`Total lines: ${totalLines}`);
  const warningThreshold = context.warningThreshold || config.warningThreshold || 15000;
  if (totalLines > warningThreshold) {
    console.warn(`Warning: Large context (${totalLines} lines). This may impact performance.`);
  }
}

async function getContextPatterns(contextName, config, visitedContexts = new Set()) {
  debug(`Getting patterns for context: ${contextName}`);
  if (visitedContexts.has(contextName)) {
    throw new QContextError(`Circular dependency detected in context: ${contextName}`, 'CIRCULAR_DEPENDENCY');
  }
  visitedContexts.add(contextName);

  const context = config.contexts[contextName];
  if (!context) {
    throw new QContextError(`Context not found: ${contextName}`, 'CONTEXT_NOT_FOUND');
  }

  let patterns = [...(context.patterns || [])];
  let exclude = [...(context.exclude || [])];

  debug(`Base patterns: ${patterns.join(', ')}`);
  debug(`Base exclude patterns: ${exclude.join(', ')}`);

  if (context.include) {
    debug(`Including contexts: ${context.include.join(', ')}`);
    const includedContextsResults = await Promise.all(
      context.include.map((includedContextName) => getContextPatterns(
        includedContextName,
        config,
        new Set(visitedContexts),
      )),
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

async function generateContextContent(files, context, config) {
  const maxLines = context.maxLines || config.maxLines || 30000;

  const fileContents = await Promise.all(
    files.map(async (file) => {
      const content = await readFileContent(file, maxLines);
      return { file, content, lines: content.split('\n').length };
    }),
  );

  let totalLines = 0;
  let content = '';

  fileContents.some(({ file, content: fileContent, lines }) => {
    if (totalLines + lines > maxLines) {
      console.warn('Reached line limit. Some files may be omitted.');
      return true; // Break the iteration
    }
    content += `--- ${file} ---\n\n${fileContent}\n\n`;
    totalLines += lines;
    return false; // Continue the iteration
  });

  return { content, totalLines };
}

module.exports = {
  handleInit,
  handleUpdate,
  handleSwitch,
  handleList,
  handleGitChanges,
  handleSetDefault,
  handleDelete,
  handleAdd,
  handleRemove,
  handleMain,
};
