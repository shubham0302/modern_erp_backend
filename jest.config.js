module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.(t|j)s',
    'libs/**/*.(t|j)s',
    '!libs/grpc-types/src/generated/**',
  ],
  moduleNameMapper: {
    '^@modern_erp/common$': '<rootDir>/libs/common/src',
    '^@modern_erp/common/(.*)$': '<rootDir>/libs/common/src/$1',
    '^@modern_erp/logger$': '<rootDir>/libs/logger/src',
    '^@modern_erp/logger/(.*)$': '<rootDir>/libs/logger/src/$1',
    '^@modern_erp/grpc-types$': '<rootDir>/libs/grpc-types/src',
    '^@modern_erp/grpc-types/(.*)$': '<rootDir>/libs/grpc-types/src/$1',
  },
  coverageDirectory: './coverage',
};
