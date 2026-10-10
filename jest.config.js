const root = __dirname;

const moduleNameMapper = {
  "^@core/(.*)$": "<rootDir>/src/core/$1",
  "^@platform/(.*)$": "<rootDir>/src/platform/$1",
  "^@app/(.*)$": "<rootDir>/src/app/$1",
  "^@ui/(.*)$": "<rootDir>/src/ui/$1",
  "^@assets/(.*)$": "<rootDir>/src/assets/$1",
};

/** @type {import('jest').Config} */
module.exports = {
  coverageThreshold: {
    global: {
      lines: 85,
      statements: 85,
      functions: 85,
      branches: 75,
    },
  },
  projects: [
    {
      displayName: { name: "core", color: "blue" },
      rootDir: root,
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/src/core/**/*.test.ts"],
      moduleNameMapper,
      collectCoverageFrom: ["<rootDir>/src/core/**/*.ts", "!<rootDir>/src/core/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
      },
    },
    {
      displayName: { name: "app", color: "magenta" },
      rootDir: root,
      preset: "jest-expo",
      testMatch: ["<rootDir>/src/ui/**/*.test.tsx"],
      moduleNameMapper,
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop))",
      ],
    },
  ],
};
