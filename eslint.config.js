const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "spikes/**",
      ".expo/**",
      "coverage/**",
      "ios/**",
      "android/**",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      "jest.config.js",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];
