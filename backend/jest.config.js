export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  transform: {},
  testTimeout: 15000,
  clearMocks: true,
};
