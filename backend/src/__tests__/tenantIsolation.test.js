const mongoose = require('mongoose');
const tenantContext = require('../utils/tenantContext');
const tenantScopePlugin = require('../models/plugins/tenantScope');

describe('tenantContext (AsyncLocalStorage store)', () => {
  test('getTenantId returns null outside of a run() context', () => {
    expect(tenantContext.getTenantId()).toBeNull();
  });

  test('getTenantId returns the tenantId bound via run()', () => {
    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      expect(tenantContext.getTenantId()).toBe('tenant-a');
    });
  });

  test('nested/concurrent contexts do not leak into each other', async () => {
    const seen = [];
    await Promise.all([
      new Promise((resolve) => {
        tenantContext.run({ tenantId: 'tenant-a' }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          seen.push(tenantContext.getTenantId());
          resolve();
        });
      }),
      new Promise((resolve) => {
        tenantContext.run({ tenantId: 'tenant-b' }, async () => {
          seen.push(tenantContext.getTenantId());
          resolve();
        });
      }),
    ]);
    expect(seen.sort()).toEqual(['tenant-a', 'tenant-b']);
  });
});

describe('tenantScopePlugin (Mongoose auto-scoping)', () => {
  function buildSchema() {
    const schema = new mongoose.Schema({ name: String });
    tenantScopePlugin(schema);
    return schema;
  }

  function getHooks(schema, hookName) {
    // Mongoose stores registered pre hooks on the internal kareem instance;
    // reach in directly since there is no public API to invoke a single
    // registered hook without a live DB connection.
    const pres = schema.s.hooks._pres.get(hookName) || [];
    return pres.map((h) => h.fn);
  }

  test('adds a tenantId field to schemas that lack one', () => {
    const schema = buildSchema();
    expect(schema.path('tenantId')).toBeDefined();
  });

  test('does not duplicate tenantId if schema already declares it', () => {
    const schema = new mongoose.Schema({ tenantId: { type: String, required: true } });
    tenantScopePlugin(schema);
    expect(schema.path('tenantId').isRequired).toBe(true);
  });

  test('find-family queries are scoped to the current tenant context', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'find');
    expect(fns.length).toBeGreaterThan(0);

    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      const filter = {};
      const fakeQuery = {
        getFilter: () => filter,
        where(cond) {
          Object.assign(filter, cond);
          return this;
        },
      };
      fns[0].call(fakeQuery, () => {
        expect(filter.tenantId).toBe('tenant-a');
        done();
      });
    });
  });

  test('an explicit tenantId filter on the query is not overridden', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'find');

    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      const filter = { tenantId: 'tenant-b' };
      const whereSpy = jest.fn();
      const fakeQuery = {
        getFilter: () => filter,
        where: whereSpy,
      };
      fns[0].call(fakeQuery, () => {
        expect(whereSpy).not.toHaveBeenCalled();
        expect(filter.tenantId).toBe('tenant-b');
        done();
      });
    });
  });

  test('queries outside any tenant context are left unscoped (no false narrowing)', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'find');
    const filter = {};
    const whereSpy = jest.fn();
    const fakeQuery = { getFilter: () => filter, where: whereSpy };
    fns[0].call(fakeQuery, () => {
      expect(whereSpy).not.toHaveBeenCalled();
      done();
    });
  });

  test('aggregate pipelines get a tenant $match prepended', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'aggregate');
    expect(fns.length).toBeGreaterThan(0);

    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      const pipeline = [{ $group: { _id: '$name' } }];
      const fakeAggregate = { pipeline: () => pipeline };
      fns[0].call(fakeAggregate, () => {
        expect(pipeline[0]).toEqual({ $match: { tenantId: 'tenant-a' } });
        done();
      });
    });
  });

  test('new documents are auto-stamped with the current tenantId on save', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'save');
    expect(fns.length).toBeGreaterThan(0);

    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      const doc = { isNew: true, tenantId: undefined };
      fns[0].call(doc, () => {
        expect(doc.tenantId).toBe('tenant-a');
        done();
      });
    });
  });

  test('an explicitly-set tenantId on a new document is not overwritten', (done) => {
    const schema = buildSchema();
    const fns = getHooks(schema, 'save');

    tenantContext.run({ tenantId: 'tenant-a' }, () => {
      const doc = { isNew: true, tenantId: 'tenant-b' };
      fns[0].call(doc, () => {
        expect(doc.tenantId).toBe('tenant-b');
        done();
      });
    });
  });
});
