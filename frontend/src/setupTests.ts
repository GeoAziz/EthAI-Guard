import '@testing-library/jest-dom';

// jsdom in the test environment doesn't implement URL.createObjectURL/revokeObjectURL
// Provide simple stubs so components that download files don't throw in tests.
if (typeof (global as any).URL !== 'undefined') {
  if (typeof (global as any).URL.createObjectURL !== 'function') {
    (global as any).URL.createObjectURL = () => 'blob:null/fake';
  }
  if (typeof (global as any).URL.revokeObjectURL !== 'function') {
    (global as any).URL.revokeObjectURL = () => {};
  }
}
