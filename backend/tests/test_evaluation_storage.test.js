const request = require('supertest');
const express = require('express');
const admin = require('firebase-admin');
const { saveEvaluation, getEvaluations, getEvaluationById } = require('../src/storage/evaluations');

// Mock Firebase Admin
jest.mock('firebase-admin', () => {
  const mockDocInstance = {
    id: 'mockDoc',
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn()
  };
  const mockCollectionInstance = {
    doc: jest.fn((_id) => mockDocInstance),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    get: jest.fn()
  };
  const firestoreFn = jest.fn(() => ({
    collection: jest.fn(() => mockCollectionInstance)
  }));
  // Attach FieldValue to the firestore namespace (like real SDK)
  firestoreFn.FieldValue = { serverTimestamp: jest.fn(() => ({ __type__: 'serverTimestamp' })) };
  return {
    firestore: firestoreFn,
    initializeApp: jest.fn()
  };
});

// Mock firebaseAuth middleware to inject a test user without verifying tokens
jest.mock('../src/middleware/firebaseAuth', () => ({
  firebaseAuth: (req, _res, next) => {
    req.user = { sub: 'user123' };
    next();
  }
}));

describe('Evaluation Storage Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('saveEvaluation should store evaluation and return ID', async () => {
    const mockEval = {
      user_id: 'user123',
      model_id: 'modelA',
      input_features: { age: 30, income: 50000 },
      risk: { score: 45, level: 'medium' },
      explanation: { summary: 'Medium risk' },
      rules: { fairness: { fairness_flag: false }, bias: { bias_flag: false }, compliance: { compliance_flag: false } },
      simulation: { normalized_output: 45 },
      timestamp: '2025-01-18T10:00:00Z',
      request_id: 'req123'
    };

    const id = await saveEvaluation(mockEval);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  test('saveEvaluation should handle Firestore unavailable gracefully', async () => {
    // Mock Firestore to throw error (only once)
    admin.firestore.mockImplementationOnce(() => {
      throw new Error('Firestore unavailable');
    });
    const mockEval = { user_id: 'user123', model_id: 'modelA', risk: { score: 50, level: 'medium' } };
    const id = await saveEvaluation(mockEval);
    expect(id).toBeNull();
  });

  test('getEvaluations should return filtered list', async () => {
    const mockSnapshot = {
      forEach: jest.fn((cb) => {
        cb({
          data: () => ({
            evaluation_id: 'eval1',
            user_id: 'user123',
            model_id: 'modelA',
            risk_score: 45,
            risk_level: 'medium',
            triggered_rules: [],
            explanation: { summary: 'Medium risk' },
            timestamp: '2025-01-18T10:00:00Z'
          })
        });
      })
    };
    const db = admin.firestore();
    db.collection().get.mockResolvedValue(mockSnapshot);

    const filters = { user_id: 'user123', risk_level: 'medium', limit: 20, offset: 0 };
    const evals = await getEvaluations(filters);
    expect(evals).toHaveLength(1);
    expect(evals[0].risk_level).toBe('medium');
  });

  test('getEvaluationById should return full evaluation', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({
        evaluation_id: 'eval1',
        user_id: 'user123',
        model_id: 'modelA',
        risk_score: 45,
        risk_level: 'medium',
        full_simulation: { normalized_output: 45 },
        full_rules: {},
        full_risk: { score: 45, level: 'medium' },
        input_features: { age: 30 },
        context: {},
        triggered_rules: [],
        explanation: { summary: 'Medium risk' },
        timestamp: '2025-01-18T10:00:00Z'
      })
    };
    const db = admin.firestore();
    db.collection().doc().get.mockResolvedValue(mockDoc);

    const result = await getEvaluationById('eval1');
    expect(result).toBeTruthy();
    expect(result.evaluation_id).toBe('eval1');
    expect(result.risk_level).toBe('medium');
  });

  test('getEvaluationById should return null for non-existent ID', async () => {
    const mockDoc = { exists: false };
    const db = admin.firestore();
    db.collection().doc().get.mockResolvedValue(mockDoc);

    const result = await getEvaluationById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('Evaluation History API', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { uid: 'user123' };
      next();
    });
    const historyRouter = require('../src/routes/evaluationHistory');
    app.use(historyRouter);
  });

  test('GET /v1/evaluations should return list', async () => {
    const mockSnapshot = {
      forEach: jest.fn((cb) => {
        cb({
          data: () => ({
            evaluation_id: 'eval1',
            user_id: 'user123',
            model_id: 'modelA',
            risk_score: 45,
            risk_level: 'medium',
            triggered_rules: [],
            explanation: { summary: 'Medium risk' },
            timestamp: '2025-01-18T10:00:00Z'
          })
        });
      })
    };
    const db = admin.firestore();
    db.collection().get.mockResolvedValue(mockSnapshot);

    const res = await request(app).get('/v1/evaluations?risk_level=medium');
    expect(res.status).toBe(200);
    expect(res.body.evaluations).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  test('GET /v1/evaluations/:id should return single evaluation', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({
        evaluation_id: 'eval1',
        user_id: 'user123',
        model_id: 'modelA',
        risk_score: 45,
        risk_level: 'medium',
        full_simulation: {},
        full_rules: {},
        full_risk: {},
        input_features: {},
        context: {},
        triggered_rules: [],
        explanation: {},
        timestamp: '2025-01-18T10:00:00Z'
      })
    };
    const db = admin.firestore();
    db.collection().doc().get.mockResolvedValue(mockDoc);

    const res = await request(app).get('/v1/evaluations/eval1');
    expect(res.status).toBe(200);
    expect(res.body.evaluation_id).toBe('eval1');
  });

  test('GET /v1/evaluations/:id should return 404 for non-existent', async () => {
    const mockDoc = { exists: false };
    const db = admin.firestore();
    db.collection().doc().get.mockResolvedValue(mockDoc);

    const res = await request(app).get('/v1/evaluations/nonexistent');
    expect(res.status).toBe(404);
  });

  test('GET /v1/evaluations/:id should return 403 for unauthorized access', async () => {
    const mockDoc = {
      exists: true,
      data: () => ({
        evaluation_id: 'eval1',
        user_id: 'other_user', // Different user
        model_id: 'modelA'
      })
    };
    const db = admin.firestore();
    db.collection().doc().get.mockResolvedValue(mockDoc);

    const res = await request(app).get('/v1/evaluations/eval1');
    expect(res.status).toBe(403);
  });
});
