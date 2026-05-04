module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|expo-router|@react-navigation/.*|react-navigation|react-native-safe-area-context|react-native-reanimated|react-native-gesture-handler|react-native-svg))",
  ],
};
