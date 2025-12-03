const { parse } = require('csv-parse/sync');

/**
 * Parse CSV text or Buffer into header, preview rows, and total rows count.
 * Throws on invalid CSV or inconsistent column counts.
 *
 * @param {Buffer|string} input
 * @param {object} options
 * @param {number} options.previewRows - number of preview rows to return
 * @returns {{ header: string[], rowsPreview: string[][], totalRows: number }}
 */
function parseCsv(input, options = {}) {
  const previewRows = Number(options.previewRows || 10);
  let text = input;
  if (Buffer.isBuffer(input)) {
    text = input.toString('utf8');
  }
  if (typeof text !== 'string') {
    throw new Error('input_must_be_string_or_buffer');
  }

  // Use csv-parse sync parser which handles quoted fields and embedded newlines
  // skip_empty_lines avoids blank trailing lines
  let records;
  try {
    records = parse(text, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false, // enforce consistent column count
    });
  } catch (e) {
    // Map common parse errors to a small set of upstream-friendly codes
    const msg = (e && e.message) ? String(e.message) : '';
    if (msg.includes('Invalid Record Length') || msg.includes('Inconsistent record length') || msg.includes('InvalidRecordLength')) {
      const err2 = new Error('malformed_csv');
      err2.cause = e;
      throw err2;
    }

    if (msg.includes('Invalid Closing Quote') || msg.includes('unterminated quoted field') || msg.includes('Invalid Opening Quote')) {
      const err2 = new Error('invalid_csv');
      err2.cause = e;
      throw err2;
    }

    const err = new Error('invalid_csv');
    err.cause = e;
    throw err;
  }

  if (!Array.isArray(records) || records.length === 0) {
    const err = new Error('empty_csv');
    throw err;
  }

  const header = records[0].map(h => (h === null || h === undefined ? '' : String(h).trim()));
  if (header.length === 0) {
    throw new Error('invalid_csv_header');
  }

  // Validate consistent column counts and build preview
  const rowsPreview = [];
  let malformed = false;
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    if (!Array.isArray(row) || row.length !== header.length) {
      malformed = true;
      break;
    }
    if (rowsPreview.length < previewRows) {
      rowsPreview.push(row.map(c => (c === null || c === undefined ? '' : String(c))));
    }
  }
  if (malformed) {
    const err = new Error('malformed_csv');
    throw err;
  }

  const totalRows = Math.max(0, records.length - 1);
  return { header, rowsPreview, totalRows };
}

module.exports = { parseCsv };
