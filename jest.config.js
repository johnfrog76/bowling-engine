/**
 * Jest rather than Vitest, deliberately.
 *
 * The engine's test suite also lives in the deck repo this was extracted from,
 * and fixes are expected to flow in both directions. Same runner means a test
 * file can be copy-pasted either way without edits.
 */
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          jsx: "react-jsx",
          // The app tsconfig sets noUnusedLocals/Parameters, which is right for
          // source and needlessly strict for test scaffolding.
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },
};
