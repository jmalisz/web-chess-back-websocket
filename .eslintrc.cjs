module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "es2022",
    sourceType: "module",
    project: ["./tsconfig.json", "./tsconfig.eslint.json"],
  },
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:eslint-comments/recommended",
    "plugin:promise/recommended",
    "plugin:unicorn/recommended",
    "prettier",
  ],
  plugins: [
    "@typescript-eslint",
    "eslint-comments",
    "no-relative-import-paths",
    "promise",
    "simple-import-sort",
    "unicorn",
  ],
  rules: {
    // https://basarat.gitbook.io/typescript/main-1/defaultisbad
    "import/extensions": "off",
    "import/no-default-export": "warn",
    "import/no-extraneous-dependencies": [
      "error",
      { devDependencies: ["vite.config.ts", "tailwind.config.ts"] },
    ],
    "import/prefer-default-export": "off",
    "no-relative-import-paths/no-relative-import-paths": [
      "error",
      { allowSameFolder: true, rootDir: "src" },
    ],
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: false,
      },
    ],
    "@typescript-eslint/explicit-function-return-type": "off",
    "simple-import-sort/exports": "warn",
    "simple-import-sort/imports": "warn",
    // Use PascalCase for components/pages and camelCase for rest
    "unicorn/filename-case": [
      "error",
      {
        cases: {
          camelCase: true,
          pascalCase: true,
        },
        ignore: ["vite-env.d.ts"],
      },
    ],
    "unicorn/no-array-for-each": "off",
    "unicorn/no-useless-undefined": ["error", { checkArguments: false }],
    "unicorn/no-null": "off",
    // Common abbreviations are known and readable
    "unicorn/prevent-abbreviations": "off",
    "consistent-return": "off",
    // Allow iterators
    'no-restricted-syntax': [
      'error',
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    "no-void": "off"
  },
};
