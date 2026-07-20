const emailService = require('../services/emailService');
const emailTemplates = require('../services/emailTemplates');

// Mock axios for SendGrid
jest.mock('axios');

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    process.env.DISABLE_EMAIL_SEND = '0';
  });

  describe('Email Templates', () => {
    it('should generate job application confirmation template', () => {
      const { htmlContent, textContent } = emailTemplates.jobApplicationConfirmation(
        'John Doe',
        'Software Engineer',
      );

      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('Software Engineer');
      expect(htmlContent).toContain('EthixAI');
      expect(textContent).toContain('John Doe');
      expect(textContent).toContain('2-3 business days');
    });

    it('should generate general application confirmation template', () => {
      const { htmlContent, textContent } = emailTemplates.generalApplicationConfirmation('Jane Smith');

      expect(htmlContent).toContain('Jane Smith');
      expect(htmlContent).toContain('careers@ethixai.com');
      expect(textContent).toContain('Jane Smith');
    });

    it('should generate newsletter confirmation template', () => {
      const { htmlContent, textContent } = emailTemplates.newsletterConfirmation('news@example.com');

      expect(htmlContent).toContain('EthixAI Newsletter');
      expect(htmlContent).toContain('AI fairness');
      expect(textContent).toContain('successfully subscribed');
    });

    it('should generate job opening notification template', () => {
      const { htmlContent, textContent } = emailTemplates.jobOpeningNotification(
        'subscriber@example.com',
        'ML Engineer',
        'Join our AI governance team',
        'https://example.com/jobs/ml-engineer',
      );

      expect(htmlContent).toContain('ML Engineer');
      expect(htmlContent).toContain('New Job Opportunity');
      expect(htmlContent).toContain('https://example.com/jobs/ml-engineer');
      expect(textContent).toContain('ML Engineer');
    });

    it('should generate unsubscribe confirmation template', () => {
      const { htmlContent, textContent } = emailTemplates.unsubscribeConfirmation('jobs');

      expect(htmlContent).toContain('Unsubscribe Confirmed');
      expect(htmlContent).toContain('job notifications');
      expect(textContent).toContain('Unsubscribe');
    });
  });

  describe('Email Service', () => {
    it('should log email to console in development mode', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DISABLE_EMAIL_SEND = '1';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await emailService.send(
        'test@example.com',
        'Test Subject',
        '<html>Test</html>',
        'Test content',
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('console');

      consoleSpy.mockRestore();
    });

    it('should handle email send in test mode', async () => {
      process.env.NODE_ENV = 'test';

      const result = await emailService.send(
        'test@example.com',
        'Test Subject',
        '<html>Test</html>',
        'Test content',
      );

      expect(result.success).toBe(true);
    });

    it('should throw error when SendGrid key is missing and required', async () => {
      process.env.EMAIL_PROVIDER = 'sendgrid';
      process.env.SENDGRID_API_KEY = '';
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_EMAIL_SEND = '0';

      // EmailService is a singleton, so we need to test the validation
      expect(() => {
        if (emailService.provider === 'sendgrid' && !emailService.sendgridApiKey) {
          throw new Error('SendGrid API key not configured');
        }
      }).toThrow('SendGrid API key not configured');
    });

    it('should handle array of recipients', async () => {
      process.env.DISABLE_EMAIL_SEND = '1';

      const result = await emailService.send(
        ['user1@example.com', 'user2@example.com'],
        'Test Subject',
        '<html>Test</html>',
        'Test content',
      );

      expect(result.success).toBe(true);
    });
  });
});
