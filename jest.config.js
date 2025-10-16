/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  roots: ["<rootDir>/src", "<rootDir>/electron"], // 👈 include Electron tests too
  moduleFileExtensions: ["ts", "tsx", "js"],
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",     // include all TS/TSX files
    "electron/**/*.ts",      // 👈 include electron source files
    "!src/**/*.d.ts",        // exclude type declarations
    "!src/**/__tests__/**",  // exclude test files
    "!electron/**/__tests__/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"], // CLI summary + LCOV + HTML report
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
};