const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function run(store, fn) {
  return storage.run(store, fn);
}

function getStore() {
  return storage.getStore() || {};
}

function getTenantId() {
  return getStore().tenantId || null;
}

module.exports = { run, getStore, getTenantId };
