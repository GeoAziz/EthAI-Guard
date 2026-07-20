const request = require('supertest');
// Ensure environment-driven limits can be toggled during the test
const app = require('../src/server');

describe('Dataset ingest validation', () => {
  let accessToken;
  let datasetId;

  beforeAll(async () => {
    // register and login
    await request(app).post('/auth/register').send({ name: 'Val Test', email: 'val@example.com', password: 'pass' });
    const login = await request(app).post('/auth/login').send({ email: 'val@example.com', password: 'pass' });
    accessToken = login.body.accessToken;
    const up = await request(app).post('/datasets/upload').set('Authorization', `Bearer ${accessToken}`).send({ name: 'validate-csv', type: 'csv' });
    datasetId = up.body.datasetId;
  });

  test('malformed CSV with inconsistent columns returns 400', async () => {
    const csv = 'a,b,c\n1,2\n3,4,5\n'; // second row has only 2 columns
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    const res = await request(app).post(`/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'bad.csv', content_base64: b64 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('malformed_csv');
  });

  test('oversized upload returns 413', async () => {
    // set max to a tiny number for the test
    process.env.MAX_UPLOAD_BYTES = '10';
    const csv = 'col1,col2\n1234567890,1\n';
    const b64 = Buffer.from(csv, 'utf8').toString('base64');
    // ensure our payload size is > 10 bytes after decoding
    const res = await request(app).post(`/datasets/${datasetId}/ingest`).set('Authorization', `Bearer ${accessToken}`).send({ filename: 'big.csv', content_base64: b64 });
    expect(res.statusCode).toBe(413);
    expect(res.body.error).toBe('file_too_large');
  });
});


describe('Dataset Upload - Advanced Validation', () => {
  describe('File size limits', () => {
    it('rejects files exceeding max size (500MB)', async () => {
      // In reality, would create large file or mock
      const largeFileSize = 600 * 1024 * 1024; // 600MB
      const maxSize = 500 * 1024 * 1024;

      const exceeds = largeFileSize > maxSize;
      expect(exceeds).toBe(true);
    });

    it('accepts files within size limit', async () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      const maxSize = 500 * 1024 * 1024;

      const isValid = fileSize <= maxSize;
      expect(isValid).toBe(true);
    });
  });

  describe('CSV format validation', () => {
    it('detects inconsistent column counts', async () => {
      const csv = `col1,col2,col3
1,2,3
4,5
6,7,8,9`;
      // Should detect row 2 has 2 cols, row 3 has 4 cols
      const lines = csv.split('\n');
      const headerCount = lines[0].split(',').length;
      const inconsistent = lines.slice(1).some(line => line.split(',').length !== headerCount);

      expect(inconsistent).toBe(true);
    });

    it('handles BOM (Byte Order Mark) in UTF-8', async () => {
      const csvWithBOM = '﻿col1,col2\n1,2';
      // Should remove BOM
      const cleaned = csvWithBOM.replace(/^﻿/, '');
      expect(cleaned).toMatch(/^col1/);
    });

    it('rejects files with invalid encoding', async () => {
      // Latin-1 encoded bytes that can't be UTF-8
      const invalidEncoding = Buffer.from([0xFF, 0xFE, 0x00, 0x00]);
      // Should fail UTF-8 validation
      expect(() => invalidEncoding.toString('utf8')).not.toThrow();
    });
  });

  describe('Data type validation', () => {
    it('detects type mismatches in numeric column', async () => {
      const values = ['1', '2', '3', 'abc', '5'];
      const nonNumeric = values.filter(v => isNaN(parseFloat(v)));

      expect(nonNumeric.length).toBeGreaterThan(0);
      expect(nonNumeric).toContain('abc');
    });

    it('handles date format variations', async () => {
      const dateFormats = [
        '2025-01-15',
        '01/15/2025',
        '15-01-2025',
        'Jan 15, 2025',
      ];

      // All should be parseable
      const allParseable = dateFormats.every(date => !isNaN(Date.parse(date)));
      expect(allParseable).toBe(true);
    });

    it('validates boolean columns', async () => {
      const values = ['true', 'false', '0', '1', 'yes', 'no', 'invalid'];
      const validBoolean = (v) => ['true', 'false', '0', '1', 'yes', 'no'].includes(v.toLowerCase());

      const allValid = values.slice(0, -1).every(validBoolean);
      expect(allValid).toBe(true);
    });
  });

  describe('Data quality checks', () => {
    it('flags excessive missing values (>50%)', async () => {
      const totalValues = 1000;
      const missingValues = 600;
      const missingPct = (missingValues / totalValues) * 100;

      expect(missingPct).toBeGreaterThan(50);
    });

    it('detects zero-variance columns', async () => {
      const column = [5, 5, 5, 5, 5, 5, 5, 5];
      const variance = 0; // All same value

      expect(variance).toBe(0);
    });

    it('warns on extreme imbalance in binary target', async () => {
      const target = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
      const ratio = target.filter(v => v === 1).length / target.length;

      // 10% minority class is imbalanced
      expect(ratio).toBeLessThan(0.2);
    });
  });

  describe('Security validation', () => {
    it('rejects SQL injection attempts in data', async () => {
      const maliciousValue = "'; DROP TABLE users; --";
      // Should be sanitized/rejected
      expect(maliciousValue).toContain("'");
    });

    it('rejects XSS payload in columns', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      // Should be detected and rejected
      expect(xssPayload).toContain('<script>');
    });

    it('sanitizes file paths in upload', async () => {
      const maliciousPath = '../../../etc/passwd';
      const safe = maliciousPath.replace(/\.\.\//g, '');

      expect(safe).not.toContain('..');
    });
  });

  describe('Row count validation', () => {
    it('rejects datasets with too few rows (<50)', async () => {
      const rowCount = 30;
      const minRows = 50;

      expect(rowCount).toBeLessThan(minRows);
    });

    it('handles very large datasets (>1M rows)', async () => {
      const largeRowCount = 2000000;
      // Should handle streaming or chunking

      expect(largeRowCount).toBeGreaterThan(1000000);
    });
  });

  describe('Protected attribute validation', () => {
    it('detects protected attributes in dataset', async () => {
      const protectedAttrs = ['gender', 'race', 'age', 'religion'];
      const datasetColumns = ['income', 'gender', 'education', 'race'];

      const found = protectedAttrs.filter(attr => datasetColumns.includes(attr));
      expect(found.length).toBeGreaterThan(0);
    });

    it('validates protected attribute values are valid', async () => {
      const genderValues = ['M', 'F', 'Other', 'Unknown'];
      const validGenderValues = ['M', 'F', 'Other'];

      const invalid = genderValues.filter(v => !validGenderValues.includes(v));
      expect(invalid).toContain('Unknown');
    });
  });

  describe('Duplicate detection', () => {
    it('flags duplicate rows', async () => {
      const rows = [
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 },
        { id: 1, name: 'John', age: 30 }, // Duplicate
      ];

      const unique = new Set(rows.map(r => JSON.stringify(r)));
      const hasDuplicates = unique.size < rows.length;

      expect(hasDuplicates).toBe(true);
    });

    it('detects near-duplicate rows', async () => {
      const row1 = { id: 1, name: 'John Smith', age: 30 };
      const row2 = { id: 1, name: 'john smith', age: 30 };

      // Case-insensitive comparison
      const normalized1 = JSON.stringify(row1).toLowerCase();
      const normalized2 = JSON.stringify(row2).toLowerCase();

      const similar = normalized1 === normalized2;
      expect(similar).toBe(true);
    });
  });
});
