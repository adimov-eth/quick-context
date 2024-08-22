const { loadConfig, saveConfig } = require('./config');

function addToContext(contextName, item) {
  const config = loadConfig();
  if (!config.contexts[contextName]) {
    throw new Error(`Context '${contextName}' does not exist.`);
  }

  const context = config.contexts[contextName];

  if (item.startsWith('!')) {
    // It's an exclude pattern
    context.exclude = context.exclude || [];
    if (!context.exclude.includes(item)) {
      context.exclude.push(item);
    }
  } else if (item.includes('*') || item.includes('/')) {
    // It's likely a file pattern
    context.patterns = context.patterns || [];
    if (!context.patterns.includes(item)) {
      context.patterns.push(item);
    }
  } else if (config.contexts[item]) {
    // It's another context
    context.include = context.include || [];
    if (!context.include.includes(item)) {
      context.include.push(item);
    }
  } else {
    // Assume it's a specific file
    context.patterns = context.patterns || [];
    if (!context.patterns.includes(item)) {
      context.patterns.push(item);
    }
  }

  saveConfig(config);
  console.log(`Added '${item}' to context '${contextName}'.`);
}

function removeFromContext(contextName, item) {
  const config = loadConfig();
  if (!config.contexts[contextName]) {
    throw new Error(`Context '${contextName}' does not exist.`);
  }

  const context = config.contexts[contextName];
  let removed = false;

  if (context.exclude && context.exclude.includes(item)) {
    context.exclude = context.exclude.filter((i) => i !== item);
    removed = true;
  }
  if (context.patterns && context.patterns.includes(item)) {
    context.patterns = context.patterns.filter((i) => i !== item);
    removed = true;
  }
  if (context.include && context.include.includes(item)) {
    context.include = context.include.filter((i) => i !== item);
    removed = true;
  }

  if (removed) {
    saveConfig(config);
    console.log(`Removed '${item}' from context '${contextName}'.`);
  } else {
    console.log(`'${item}' not found in context '${contextName}'.`);
  }
}

module.exports = {
  addToContext,
  removeFromContext,
};
