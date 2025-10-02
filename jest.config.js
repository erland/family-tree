/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "tsx", "js"],
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",     // include all TS/TSX files
    "!src/**/*.d.ts",        // exclude type declarations
    "!src/**/__tests__/**",  // exclude test files
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"], // CLI summary + LCOV + HTML report
};