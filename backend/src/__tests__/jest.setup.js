/**
 * Jest setup: enable auth test bypass so tests that rely on the
 * NODE_ENV=test auth bypass continue to work after security hardening.
 */
process.env.AUTH_TEST_BYPASS = '1';
process.env.USE_LOCALSTACK = 'true';
process.env.LOCALSTACK_ENDPOINT = 'http://localhost:4566';
process.env.NODE_ENV = 'test';

// Mock ldapjs to prevent timeout hangs
jest.mock('ldapjs', () => ({
  createClient: jest.fn(() => ({
    bind: jest.fn((dn, password, callback) => {
      if (password === 'invalid') {
        callback(new Error('Invalid credentials'));
      } else {
        callback(null);
      }
    }),
    search: jest.fn((base, options, callback) => {
      if (callback && typeof callback === 'function') {
        callback(null, {
          on: jest.fn((event, handler) => {
            if (event === 'searchEntry') {
              handler({ object: { cn: 'test', mail: 'test@example.com' } });
            } else if (event === 'end') {
              setTimeout(handler, 10);
            }
          }),
          abort: jest.fn(),
        });
      }
    }),
    unbind: jest.fn((callback) => {
      if (callback) callback(null);
    }),
    on: jest.fn(),
    once: jest.fn(),
  })),
}));
