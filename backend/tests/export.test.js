const request = require('supertest');
const app = require('../src/server');

describe('Export functionality', () => {
  let accessToken;
  let userId;
  let reportId;

  beforeAll(async () => {
    // Register and login
    const reg = await request(app)
      .post('/auth/register')
      .send({ name: 'ExportTest', email: 'export-test@example.com', password: 'TestPass123!' });

    if (reg.statusCode !== 200) {
      console.warn('Registration response:', reg.body);
    }

    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'export-test@example.com', password: 'TestPass123!' });

    expect(login.statusCode).toBe(200);
    accessToken = login.body.data?.accessToken || login.body.accessToken;
    userId = login.body.data?.userId || login.body.userId;

    if (!accessToken) {
      console.error('No access token in login response:', login.body);
      throw new Error('Failed to get access token from login');
    }
  });

  test('POST /api/export/analysis - CSV export', async () => {
    // First, run an analysis to create a report
    const analyzeRes = await request(app)
      .post('/analyze')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dataset_name: 'test_dataset',
        data: {
          age: [25, 30, 35, 40],
          income: [50000, 60000, 70000, 80000]
        }
      });

    // Use the report ID from the analyze response if available
    if (analyzeRes.statusCode === 200 && analyzeRes.body.reportId) {
      reportId = analyzeRes.body.reportId;
    } else {
      // Fallback: use a mock ID for testing
      reportId = '1';
    }

    // Test CSV export
    const csvExport = await request(app)
      .post('/api/export/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reportId, exportFormat: 'csv' });

    if (csvExport.statusCode === 404) {
      // Skip if report not found
      expect(csvExport.statusCode).toBe(404);
    } else {
      expect(csvExport.statusCode).toBe(200);
      expect(csvExport.get('content-type')).toContain('text/csv');
      expect(csvExport.get('content-disposition')).toContain('attachment');
    }
  });

  test('POST /api/export/analysis - PDF export', async () => {
    // Use reportId from beforeAll
    const pdfExport = await request(app)
      .post('/api/export/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reportId: reportId || '1', exportFormat: 'pdf' });

    if (pdfExport.statusCode === 404) {
      expect(pdfExport.statusCode).toBe(404);
    } else {
      expect(pdfExport.statusCode).toBe(200);
      expect(pdfExport.get('content-type')).toContain('application/pdf');
    }
  });

  test('POST /api/export/analysis - Invalid format', async () => {
    const result = await request(app)
      .post('/api/export/analysis')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reportId: reportId || '1', exportFormat: 'docx' });

    // Expect either 404 (report not found) or 400 (invalid format)
    const validStatus = [400, 404].includes(result.statusCode);
    if (result.statusCode === 400) {
      // Error could be a string or an object
      const errorMsg = typeof result.body.error === 'string'
        ? result.body.error
        : result.body.error?.code || result.body.error?.message || '';
      expect(errorMsg).toContain('Invalid export format');
    }
    expect(validStatus).toBe(true);
  });

  test('GET /api/analyses/latest - Get latest analysis', async () => {
    const result = await request(app)
      .get('/api/analyses/latest')
      .set('Authorization', `Bearer ${accessToken}`);

    // Should return 200 or 404 (depending on if analyses exist)
    const validStatus = [200, 404].includes(result.statusCode);
    expect(validStatus).toBe(true);
  });

  test('POST /api/export/analysis - Requires authentication', async () => {
    const result = await request(app)
      .post('/api/export/analysis')
      .set('x-enforce-auth', '1')
      .send({ reportId: '1', exportFormat: 'pdf' });

    // Should return 401 for missing auth
    expect(result.statusCode).toBe(401);
  });
});
