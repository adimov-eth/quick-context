# Q Context

Q Context is a powerful Command Line Interface (CLI) tool designed to help developers manage and switch between different sets of files (contexts) in their projects. It's particularly useful for:

- Focusing on specific parts of a large codebase
- Preparing relevant code snippets for AI assistants or code reviews
- Quickly switching between different areas of work in a project

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Configuration](#configuration)
4. [Command Reference](#command-reference)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)
7. [Contributing](#contributing)

## Installation

To install Q Context globally, run:

```bash
npm install -g q-context
```

After installation, you can use the `q` command in your terminal.

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
```

## Configuration

Q Context uses a configuration file named `.ctx` to store context definitions. This file can be either local (in your project directory) or global (in your home directory).

### Local vs Global Configuration

- Local configuration: `.ctx` file in your project directory or any parent directory
- Global configuration: `~/.ctx` file in your home directory

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

## Command Reference

### `q init`

Initialize the configuration interactively.

### `q update <name> [patterns...]`

Create or update a context with the given name and file patterns.

Options:
- `--maxLines`: Maximum number of lines to include in the context
- `--warningThreshold`: Number of lines at which to show a warning

### `q switch <name>`

Switch to an existing context.

### `q list`

List all available contexts.

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

## Examples

1. Create a context for frontend work:
   ```bash
   q update frontend 'src/**/*.js' 'src/**/*.jsx' '!src/**/*.test.js'
   ```

2. Switch to the frontend context:
   ```bash
   q switch frontend
   ```

3. Create a context from current Git changes:
   ```bash
   q git-changes current-work
   ```

4. Set a default context:
   ```bash
   q set-default main
   ```

5. List all contexts:
   ```bash
   q list
   ```

6. Use the current context:
   ```bash
   q
   ```

## Troubleshooting

If you encounter issues:

1. Ensure you're using the latest version of Q Context.
2. Check your `.ctx` file for any syntax errors.
3. Run commands with debug output: `DEBUG=true q ...`
4. Make sure you have the necessary permissions to read/write in your project directory and home directory.
5. If a context is not found, ensure it's defined in your `.ctx` file.

## Contributing

Contributions to Q Context are welcome! Please feel free to submit issues or pull requests on the project's GitHub repository.

When contributing:
1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Write tests for your changes
4. Ensure all tests pass
5. Submit a pull request with a clear description of your changes

For major changes, please open an issue first to discuss what you would like to change.