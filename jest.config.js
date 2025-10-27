/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  roots: ["<rootDir>/src"], // 👈 include Electron tests too
  moduleFileExtensions: ["ts", "tsx", "js"],
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",     // include all TS/TSX files
    "!src/**/*.d.ts",        // exclude type declarations
    "!src/**/__tests__/**",  // exclude test files
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"], // CLI summary + LCOV + HTML report
  moduleNameMapper: {
    "^@core$": "<rootDir>/src/core/index.ts",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};