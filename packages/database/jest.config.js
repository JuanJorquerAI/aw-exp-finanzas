module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  // Los de integración necesitan la base desechable: ver jest.int.config.js
  testPathIgnorePatterns: ["\\.int\\.test\\.ts$"],
};
