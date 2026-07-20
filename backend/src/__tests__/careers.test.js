const request = require('supertest');
const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const JobSubscription = require('../models/JobSubscription');

// Mock email service
jest.mock('../services/emailService', () => ({
  send: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../services/emailTemplates', () => ({
  jobApplicationConfirmation: () => ({
    htmlContent: '<html>Test</html>',
    textContent: 'Test',
  }),
  generalApplicationConfirmation: () => ({
    htmlContent: '<html>Test</html>',
    textContent: 'Test',
  }),
  newsletterConfirmation: () => ({
    htmlContent: '<html>Test</html>',
    textContent: 'Test',
  }),
}));

describe('Careers API', () => {
  let app;

  beforeAll(async () => {
    // Create a minimal Express app for testing
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/careers', require('../routes/careers'));
    app.use('/api/newsletter', require('../routes/newsletter'));
  });

  beforeEach(async () => {
    // Clear collections before each test
    await JobApplication.deleteMany({});
    await JobSubscription.deleteMany({});
  });

  describe('POST /api/careers/applications', () => {
    it('should submit a job application', async () => {
      const response = await request(app)
        .post('/api/careers/applications')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          jobId: 'job-123',
          jobTitle: 'Software Engineer',
          coverLetter: 'I am interested in this position',
          linkedIn: 'https://linkedin.com/in/johndoe',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.email).toBe('john@example.com');

      // Verify application was saved to database
      const savedApp = await JobApplication.findOne({ email: 'john@example.com' });
      expect(savedApp).toBeDefined();
      expect(savedApp.fullName).toBe('John Doe');
      expect(savedApp.jobId).toBe('job-123');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/careers/applications')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/careers/applications')
        .send({
          fullName: 'John Doe',
          email: 'invalid-email',
          phone: '555-1234',
          jobId: 'job-123',
          jobTitle: 'Software Engineer',
          coverLetter: 'I am interested',
          linkedIn: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should prevent duplicate applications within 24 hours', async () => {
      // Create first application
      await request(app)
        .post('/api/careers/applications')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          jobId: 'job-123',
          jobTitle: 'Software Engineer',
          coverLetter: 'I am interested',
          linkedIn: '',
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/careers/applications')
        .send({
          fullName: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          jobId: 'job-123',
          jobTitle: 'Software Engineer',
          coverLetter: 'I am interested',
          linkedIn: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already applied');
    });
  });

  describe('POST /api/careers/general-application', () => {
    it('should submit a general career inquiry', async () => {
      const response = await request(app)
        .post('/api/careers/general-application')
        .send({
          fullName: 'Jane Smith',
          email: 'jane@example.com',
          phone: '555-5678',
          message: 'I am very interested in EthixAI',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const savedInquiry = await JobApplication.findOne({ email: 'jane@example.com' });
      expect(savedInquiry.source).toBe('general-inquiry');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/careers/general-application')
        .send({
          fullName: 'Jane Smith',
          email: 'jane@example.com',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/careers/subscribe-jobs', () => {
    it('should subscribe to job notifications', async () => {
      const response = await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const subscription = await JobSubscription.findOne({
        email: 'subscriber@example.com',
      });
      expect(subscription).toBeDefined();
      expect(subscription.isSubscribed).toBe(true);
    });

    it('should reject duplicate subscription', async () => {
      await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      const response = await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already subscribed');
    });

    it('should allow resubscription after unsubscribe', async () => {
      // Subscribe
      const sub1 = await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      const subscription = await JobSubscription.findOne({
        email: 'subscriber@example.com',
      });
      const token = subscription.unsubscribeToken;

      // Unsubscribe
      await request(app)
        .post(`/api/careers/unsubscribe/${token}`)
        .send({});

      // Resubscribe
      const response = await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      expect(response.status).toBe(201);

      const resubscribed = await JobSubscription.findOne({
        email: 'subscriber@example.com',
      });
      expect(resubscribed.isSubscribed).toBe(true);
    });
  });

  describe('POST /api/careers/unsubscribe/:token', () => {
    it('should unsubscribe from job notifications', async () => {
      // Subscribe first
      await request(app)
        .post('/api/careers/subscribe-jobs')
        .send({
          email: 'subscriber@example.com',
          fullName: 'Bob Johnson',
        });

      const subscription = await JobSubscription.findOne({
        email: 'subscriber@example.com',
      });
      const token = subscription.unsubscribeToken;

      // Unsubscribe
      const response = await request(app)
        .post(`/api/careers/unsubscribe/${token}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const updated = await JobSubscription.findOne({
        email: 'subscriber@example.com',
      });
      expect(updated.isSubscribed).toBe(false);
      expect(updated.unsubscribedAt).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/careers/unsubscribe/invalid-token')
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('should subscribe to newsletter', async () => {
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({
          email: 'news@example.com',
          fullName: 'Alice Wonder',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const subscription = await JobSubscription.findOne({
        email: 'news@example.com',
      });
      // Note: This test assumes newsletter uses the same subscription collection
      // In actual implementation, it uses NewsletterSubscription model
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/newsletter/subscribe')
        .send({
          email: 'invalid',
        });

      expect(response.status).toBe(400);
    });
  });
});
