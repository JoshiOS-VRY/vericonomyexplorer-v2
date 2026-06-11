/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        // Transpile each file in isolation: avoids whole-program type-checking
        // (and TS6's stricter rootDir inference) so the unit suite stays fast
        // and resilient to compiler upgrades.
        isolatedModules: true,
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'bundler',
          incremental: false,
          composite: false,
          rootDir: '.',
          target: 'ES2020',
          verbatimModuleSyntax: false,
          ignoreDeprecations: '6.0',
        },
      },
    ],
  },
};
