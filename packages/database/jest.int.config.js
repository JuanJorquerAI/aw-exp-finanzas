// Tests de integración contra Postgres desechable (TEST_DATABASE_URL, base *_test).
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.int.test.ts"],
  testTimeout: 60000,
};
