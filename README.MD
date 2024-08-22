# Q Context

Q Context is a powerful Command Line Interface (CLI) tool designed to help developers manage and switch between different sets of files (contexts) in their projects. It's your friendly companion for:

- 🔍 Focusing on specific parts of a large codebase
- 🤖 Preparing relevant code snippets for AI assistants or code reviews
- 🚀 Quickly switching between different areas of work in a project

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Core Concepts](#core-concepts)
4. [Usage](#usage)
5. [Configuration](#configuration)
6. [Command Reference](#command-reference)
7. [Advanced Features](#advanced-features)
8. [Troubleshooting](#troubleshooting)
9. [Contributing](#contributing)

## Installation

As this project is currently only available on GitHub, you can install it by cloning the repository:

```bash
git clone https://github.com/your-username/q-context.git
cd q-context
npm install
```

To use the `q` command globally on your system, you can link the package:

```bash
npm link
```

This will create a symlink to the q-context package in your global node_modules directory.

## Development

For local development:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/q-context.git
   ```
2. Navigate to the project directory:
   ```bash
   cd q-context
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the CLI locally:
   ```bash
   node bin/quick-context.js
   ```

## Usage

After linking the package, you can use the `q` command in your terminal:

## Quick Start

1. Initialize Q Context:
   ```bash
   q init
   ```
   This will guide you through creating your first context.

2. Create a new context:
   ```bash
   q update mycontext '*.js' '!node_modules/**'
   ```
   This creates a context named "mycontext" that includes all JavaScript files but excludes the `node_modules` directory.

3. Switch to the context:
   ```bash
   q switch mycontext
   ```

4. Use the context (copy files to clipboard):
   ```bash
   q
   ```
   This will copy the content of all files in your current context to your clipboard.

## Core Concepts

### Contexts

A context in Q Context is a named set of file patterns. These patterns determine which files are included when the context is activated. Think of it as a snapshot of your project that you can easily switch between.

### Patterns

Patterns are glob-style strings that match file paths. They can include wildcards and negations. For example:

- `*.js`: Matches all JavaScript files in the current directory
- `**/*.js`: Matches all JavaScript files in the current directory and all subdirectories
- `!node_modules`: Excludes the `node_modules` directory

### Current Context

The currently active context. When you switch contexts or update a context, it becomes the current context.

### Default Context

A context that is automatically used when no specific context is specified.

## Usage

Q Context uses the concept of "contexts" - named sets of file patterns that determine which files are included when the context is activated. Here are some basic usage examples:

```bash
# Initialize Q Context (first-time setup)
q init

# Create or update a context
q update mycontext '*.js' '!node_modules/**'

# Switch to a context
q switch mycontext

# List all available contexts
q list

# Use the current context (copies files to clipboard)
q

# Add a new pattern to an existing context
q add mycontext '*.jsx'

# Remove a pattern from an existing context
q remove mycontext '*.test.js'
```

## Configuration

Q Context uses a configuration file named `.ctx` to store context definitions. This file can be either local (in your project directory) or global (in your home directory).

### Local vs Global Configuration

- Local configuration: `.ctx` file in your project directory or any parent directory
- Global configuration: `~/.qctx/.ctx` file in your home directory

Local configuration takes precedence over global configuration.

### Configuration File Format

The `.ctx` file can be in either YAML or JSON format. Here's an example:

```yaml
contexts:
  frontend:
    patterns:
      - 'src/**/*.js'
      - 'src/**/*.jsx'
      - '!src/**/*.test.js'
    maxLines: 20000
    warningThreshold: 10000
    description: "Frontend JavaScript and React files"
    exclude:
      - 'src/vendor/**'
  backend:
    patterns:
      - 'server/**/*.js'
      - 'db/**/*.js'
    include:
      - 'shared'
    description: "Backend Node.js files including shared utilities"
  shared:
    patterns:
      - 'shared/**/*.js'
    description: "Shared utility functions"
default: frontend
maxLines: 30000
warningThreshold: 15000
cleanup:
  enabled: true
  maxAge: 7
  maxFiles: 100
```

### Context Properties

Each context can have the following properties:

- `patterns` (required): An array of glob patterns to match files.
- `maxLines` (optional): The maximum number of lines to include when copying content from this context. Overrides the global `maxLines` setting.
- `warningThreshold` (optional): The number of lines at which to show a warning about the context size. Overrides the global `warningThreshold` setting.
- `description` (optional): A brief description of what the context is for.
- `include` (optional): An array of other context names to include, allowing for composition of contexts.
- `exclude` (optional): An array of patterns to explicitly exclude, even if matched by the include patterns.

Global settings:

- `default`: The name of the default context to use when no context is specified.
- `maxLines`: The global maximum number of lines for all contexts.
- `warningThreshold`: The global warning threshold for all contexts.
- `cleanup`: Settings for automatic cleanup of old context files.

## Command Reference

### `q init`

Initialize the configuration interactively.

### `q update <name> [patterns...]`

Create or update a context with the given name and file patterns.

Options:
- `--maxLines`: Maximum number of lines to include in the context
- `--warningThreshold`: Number of lines at which to show a warning
- `--description`: A brief description of the context
- `--include`: Other contexts to include (comma-separated)
- `--exclude`: Patterns to exclude (comma-separated)

### `q switch <name>`

Switch to an existing context.

### `q list`

List all available contexts.

### `q add <context> <item>`

Add a filter, context, or file to an existing context.

- If `<item>` starts with `!`, it's added as an exclude pattern.
- If `<item>` contains `*` or `/`, it's added as a file pattern.
- If `<item>` matches an existing context name, it's added as an included context.
- Otherwise, `<item>` is treated as a specific file to include.

Example:
```bash
q add mycontext '*.js'  # Add a file pattern
q add mycontext '!node_modules'  # Add an exclude pattern
q add mycontext othercontext  # Include another context
q add mycontext specific_file.js  # Add a specific file
```

### `q remove <context> <item>`

Remove a filter, context, or file from an existing context.

Example:
```bash
q remove mycontext '*.js'  # Remove a file pattern
q remove mycontext '!node_modules'  # Remove an exclude pattern
q remove mycontext othercontext  # Remove an included context
q remove mycontext specific_file.js  # Remove a specific file
```

### `q git-changes <name>`

Create a context from unstaged Git changes.

### `q git-staged <name>`

Create a context from staged Git changes.

### `q set-default <name>`

Set the default context.

### `q [context]`

Load the specified context (or the current context if not specified) to the clipboard.

### `q delete <name>`

Delete an existing context.

## Advanced Features

### Context Composition

You can include other contexts within a context using the `include` property. This allows you to create modular and reusable contexts.

Example:
```bash
q update backend 'server/**/*.js' --include shared,database
```

### Debug Mode

Run commands with `DEBUG=true` to see detailed debug output:

```bash
DEBUG=true q
```

This will provide more information about file operations, context loading, and other internal processes.

### MaxLines and Content Truncation

When copying context content to the clipboard, Q Context will truncate the content if it exceeds the `maxLines` limit (either set per-context or globally). This helps prevent performance issues with extremely large contexts.

### State Management

Q Context maintains a separate state file to track the current context per directory. This allows you to have different active contexts in different project directories.

### Context File Storage

When you use the `q` command to load a context to the clipboard, Q Context also saves a copy of the flattened context to a file in the `~/.qctx/` directory. This allows you to:

1. Easily share context files with AI assistants or team members.
2. Keep a history of your context usage.
3. Access previously used contexts without regenerating them.

The saved files are named using the format: `contextName_timestamp.txt`.

Example:
```bash
q mycontext
# Output:
# Context 'mycontext' with 10 files loaded to clipboard.
# Context saved to: /home/user/.qctx/mycontext_2023-05-15T14-30-45-123Z.txt
```

### Automatic Cleanup

Q Context can automatically clean up old context files based on your configuration settings. This helps manage disk usage and keeps your context history tidy.

The cleanup process now provides statistics on the number of files deleted and the amount of space freed. You can also perform a "dry run" to see what would be cleaned up without actually deleting any files.

Example usage in your scripts:

```javascript
const { cleanupOldFiles } = require('./lib/file_operations');

// Perform actual cleanup
const { deletedCount, freedSpace } = await cleanupOldFiles(config);
console.log(`Deleted ${deletedCount} files, freeing ${freedSpace} bytes`);

// Perform a dry run
const dryRunResults = await cleanupOldFiles(config, true);
console.log(`Dry run would delete ${dryRunResults.deletedCount} files, freeing ${dryRunResults.freedSpace} bytes`);
```

## Troubleshooting

If you encounter issues:

1. Ensure you're using the latest version of Q Context.
2. Check your `.ctx` file for any syntax errors.
3. Run commands with debug output: `DEBUG=true q ...`
4. Make sure you have the necessary permissions to read/write in your project directory and home directory.
5. If a context is not found, ensure it's defined in your `.ctx` file.
6. Check the state file (`~/.qctx/.ctx`) if you're having issues with context switching between directories.
7. If you receive errors about file operations, check your disk space and file permissions.

## Contributing

Contributions to Q Context are welcome! Please feel free to submit issues or pull requests on the project's GitHub repository.

When contributing:
1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request with a clear description of your changes

For major changes, please open an issue first to discuss what you would like to change.

---

Happy coding with Q Context! If you have any questions or need further assistance, don't hesitate to reach out. 🚀👩‍💻👨‍💻