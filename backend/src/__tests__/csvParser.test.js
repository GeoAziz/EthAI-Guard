const { parseCsv } = require('../utils/csvParser');

describe('csvParser utility', () => {
  test('parses simple CSV with header and rows', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6\n';
    const { header, rowsPreview, totalRows } = parseCsv(csv, { previewRows: 10 });
    expect(header).toEqual(['a', 'b', 'c']);
    expect(totalRows).toBe(2);
    expect(rowsPreview.length).toBe(2);
    expect(rowsPreview[0]).toEqual(['1', '2', '3']);
  });

  test('handles quoted fields and commas inside quotes', () => {
    // Use RFC4180-style escaping for quotes inside quoted fields (double the quote)
    const csv = 'name,notes\n"Doe, John","He said, ""hello"" to me"\n"Jane","No notes"\n';
    const { header, rowsPreview, totalRows } = parseCsv(csv, { previewRows: 10 });
    expect(header).toEqual(['name', 'notes']);
    expect(totalRows).toBe(2);
    expect(rowsPreview[0][0]).toBe('Doe, John');
    expect(rowsPreview[0][1]).toBe('He said, "hello" to me');
  });

  test('handles embedded newlines inside quoted fields', () => {
    const csv = 'id,desc\n1,"Line1\nLine2\nLine3"\n2,"Another\nEntry"\n';
    const { header, rowsPreview, totalRows } = parseCsv(csv, { previewRows: 10 });
    expect(header).toEqual(['id', 'desc']);
    expect(totalRows).toBe(2);
    expect(rowsPreview[0][1]).toContain('Line1');
    expect(rowsPreview[0][1]).toContain('Line3');
  });

  test('throws on inconsistent columns', () => {
    const csv = 'a,b,c\n1,2\n3,4,5\n';
    expect(() => parseCsv(csv)).toThrow(/malformed_csv/);
  });
});
