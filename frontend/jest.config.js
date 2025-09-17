const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^next/image$': '<rootDir>/test/__mocks__/nextImageMock.js',
    '^.+\\.(css|less|sass|scss)$': 'identity-obj-proxy',
    '^.+\\.(gif|ico|jpg|jpeg|png|svg|webp)$': '<rootDir>/test/__mocks__/fileMock.js',
  },
  moduleDirectories: ['node_modules', '<rootDir>/'],
};

module.exports = createJestConfig(customJestConfig);
