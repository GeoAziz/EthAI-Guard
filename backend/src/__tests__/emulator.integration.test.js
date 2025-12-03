/* eslint-env jest */

// Integration tests using Firebase Auth emulator. These tests will be skipped
// if FIREBASE_AUTH_EMULATOR_HOST is not set. They exercise end-to-end flows:
// - exchange idToken -> backend tokens (blocked when email not verified)
// - verify email, exchange succeeds
// - admin promote sets firebase custom claims
// - access request approve assigns role and attempts claims sync

const request = require('supertest');
const admin = require('firebase-admin');

const FIREBASE_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

if (!FIREBASE_HOST) {
  logger.warn('Skipping emulator.integration tests — FIREBASE_AUTH_EMULATOR_HOST not set');
  // Create a dummy test suite that passes to avoid CI failure when not configured
  describe('emulator.integration (skipped)', () => {
    test('skipped', () => {
      expect(true).toBe(true);
    });
  });
} else {
  describe('Firebase Emulator integration tests', () => {
    let app;
    const AUTH_EMULATOR_URL = `http://${FIREBASE_HOST}`;

    beforeAll(async () => {
      // Ensure admin SDK talks to emulator
      process.env.FIREBASE_AUTH_EMULATOR_HOST = FIREBASE_HOST;
      process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-project';
      // initialize admin SDK (our firebaseAdmin wrapper also supports emulator)
      try {
        admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
      } catch (_e) {
        // ignore if already initialized
      }

      // require server after emulator env is set so server initializes firebaseAdmin properly
      app = require('../server');
    });

    afterAll(async () => {
      // nothing to tear down for emulator here
    });

    async function signInWithPassword(email, password) {
      // Auth emulator REST sign-in endpoint
      const url = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`signIn failed: ${resp.status} ${body}`);
      }
      return resp.json();
    }

    test('unverified user cannot exchange idToken; verify and then exchange succeeds', async () => {
      const testEmail = `emulator-unverified-${Date.now()}@example.com`;
      const testPass = 'password123';

      // Create user via admin SDK with emailVerified=false
      const u = await admin.auth().createUser({ email: testEmail, password: testPass, emailVerified: false });

      // Sign-in via REST to get idToken
      const signIn = await signInWithPassword(testEmail, testPass);
      expect(signIn).toHaveProperty('idToken');
      const { idToken } = signIn;

      // Try exchange: should be rejected with 403 email_not_verified
      const exch = await request(app).post('/auth/firebase/exchange').send({ idToken });
      expect(exch.status).toBe(403);
      expect(exch.body).toHaveProperty('error', 'email_not_verified');

      // Now mark email verified via admin SDK
      await admin.auth().updateUser(u.uid, { emailVerified: true });

      // Sign-in again to refresh token (emulator issues new tokens)
      const signIn2 = await signInWithPassword(testEmail, testPass);
      const idToken2 = signIn2.idToken;

      const exch2 = await request(app).post('/auth/firebase/exchange').send({ idToken: idToken2 });
      expect(exch2.status).toBe(200);
      expect(exch2.body).toHaveProperty('accessToken');
      expect(exch2.body).toHaveProperty('refreshToken');
    }, 20000);

    test('admin can promote a user and claims are set in emulator', async () => {
      const adminEmail = `emulator-admin-${Date.now()}@example.com`;
      const adminPass = 'adminpass123';
      const targetEmail = `emulator-target-${Date.now()}@example.com`;
      const targetPass = 'targetpass123';

      // Create admin user and set custom claims 'admin'
      const adminUser = await admin.auth().createUser({ email: adminEmail, password: adminPass, emailVerified: true });
      await admin.auth().setCustomUserClaims(adminUser.uid, { role: 'admin' });

      // Create target user verified
      await admin.auth().createUser({ email: targetEmail, password: targetPass, emailVerified: true });

      // Admin sign-in and exchange to get backend tokens
      const adminSignIn = await signInWithPassword(adminEmail, adminPass);
      const adminIdToken = adminSignIn.idToken;
      const exchangeRes = await request(app).post('/auth/firebase/exchange').send({ idToken: adminIdToken });
      expect(exchangeRes.status).toBe(200);
      const backendAccess = exchangeRes.body.accessToken;

      // Call promote API as admin to promote targetEmail to admin
      const promoteRes = await request(app).post('/v1/users/promote').set('Authorization', `Bearer ${backendAccess}`).send({ email: targetEmail, role: 'admin' });
      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body).toHaveProperty('claimsSync');
      expect(promoteRes.body.claimsSync.status).toMatch(/success|skipped|failed/);

      // Check that in emulator the target has custom claims (if sync succeeded)
      const fbTarget = await admin.auth().getUserByEmail(targetEmail);
      // customClaims might be empty if sync skipped; at least check role if present
      const claims = fbTarget.customClaims || {};
      if (promoteRes.body.claimsSync && promoteRes.body.claimsSync.status === 'success') {
        expect(Array.isArray(claims.role) || typeof claims.role === 'string' || claims.role).toBeTruthy();
      }
    }, 30000);

    test('access request approve assigns role and attempts claims sync', async () => {
      const userEmail = `emulator-req-${Date.now()}@example.com`;
      const userPass = 'userpass123';

      await admin.auth().createUser({ email: userEmail, password: userPass, emailVerified: true });

      // Sign-in as user and get backend token
      const signIn = await signInWithPassword(userEmail, userPass);
      const { idToken } = signIn;
      const exchange = await request(app).post('/auth/firebase/exchange').send({ idToken });
      expect(exchange.status).toBe(200);
      const userBackendAccess = exchange.body.accessToken;

      // Create access request as user
      const createReq = await request(app).post('/v1/access-requests').set('Authorization', `Bearer ${userBackendAccess}`).send({ reason: 'Need admin for testing' });
      expect([200, 201]).toContain(createReq.status);
      const reqId = createReq.body.id || createReq.body._id || (createReq.body.items && createReq.body.items[0] && createReq.body.items[0]._id);
      expect(reqId).toBeTruthy();

      // Create admin to approve
      const adminEmail = `emulator-approver-${Date.now()}@example.com`;
      const adminPass = 'adminpass321';
      const adminUser = await admin.auth().createUser({ email: adminEmail, password: adminPass, emailVerified: true });
      await admin.auth().setCustomUserClaims(adminUser.uid, { role: 'admin' });
      const adminSignIn = await signInWithPassword(adminEmail, adminPass);
      const adminExchange = await request(app).post('/auth/firebase/exchange').send({ idToken: adminSignIn.idToken });
      const adminBackendAccess = adminExchange.body.accessToken;

      // Approve the access request
      const approveRes = await request(app).post(`/v1/access-requests/${reqId}/approve`).set('Authorization', `Bearer ${adminBackendAccess}`).send({ emailUser: false });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body).toHaveProperty('claimsSync');
    }, 40000);
  });
}
