module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [
    {
      env: {
        node: true,
      },
      files: [
        '.eslintrc.{js,cjs}',
      ],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': 'off', // Allow console.log since this is a CLI tool
    'import/no-dynamic-require': 'off', // Allow dynamic requires
    'global-require': 'off', // Allow requires inside functions
    'no-use-before-define': ['error', { functions: false, classes: true }], // Allow function hoisting
    'no-param-reassign': ['error', { props: false }], // Allow modifying properties of parameters
    'max-len': ['error', { code: 120 }], // Increase max line length to 120 characters
  },
};
