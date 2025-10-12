const test = require('node:test');
const assert = require('node:assert');
const {
  formatBytes,
  formatDuration,
  formatPercent,
  formatNumber,
  escapeHtml,
  safeJson,
  percentile,
  formatDate,
  BYTE_UNITS
} = require('./formatters');

test('formatBytes - handles zero and negative values', () => {
  assert.strictEqual(formatBytes(0), '0 B');
  assert.strictEqual(formatBytes(-100), '0 B');
  assert.strictEqual(formatBytes(NaN), '0 B');
  assert.strictEqual(formatBytes(undefined), '0 B');
});

test('formatBytes - formats bytes correctly', () => {
  assert.strictEqual(formatBytes(1), '1 B');
  assert.strictEqual(formatBytes(512), '512 B');
  assert.strictEqual(formatBytes(1023), '1023 B');
});

test('formatBytes - formats kilobytes correctly', () => {
  assert.strictEqual(formatBytes(1024), '1 KB');
  assert.strictEqual(formatBytes(1536), '1.5 KB');
  assert.strictEqual(formatBytes(10240), '10 KB');
  assert.strictEqual(formatBytes(102400), '100 KB');
});

test('formatBytes - formats megabytes correctly', () => {
  assert.strictEqual(formatBytes(1024 * 1024), '1 MB');
  assert.strictEqual(formatBytes(1.5 * 1024 * 1024), '1.5 MB');
  assert.strictEqual(formatBytes(100 * 1024 * 1024), '100 MB');
});

test('formatBytes - formats gigabytes correctly', () => {
  assert.strictEqual(formatBytes(1024 * 1024 * 1024), '1 GB');
  assert.strictEqual(formatBytes(2.5 * 1024 * 1024 * 1024), '2.5 GB');
});

test('formatBytes - formats terabytes correctly', () => {
  assert.strictEqual(formatBytes(1024 * 1024 * 1024 * 1024), '1 TB');
  assert.strictEqual(formatBytes(1.234 * 1024 * 1024 * 1024 * 1024), '1.23 TB');
});

test('formatBytes - formats petabytes correctly', () => {
  assert.strictEqual(formatBytes(1024 * 1024 * 1024 * 1024 * 1024), '1 PB');
});

test('formatBytes - rounds large values appropriately', () => {
  const result = formatBytes(999 * 1024);
  assert.ok(result.includes('KB'));
  assert.ok(!result.includes('.'));
});

test('formatDuration - handles zero and invalid values', () => {
  assert.strictEqual(formatDuration(0), '0 ms');
  assert.strictEqual(formatDuration(-100), '0 ms');
  assert.strictEqual(formatDuration(NaN), '0 ms');
});

test('formatDuration - formats milliseconds correctly', () => {
  assert.strictEqual(formatDuration(1), '1 ms');
  assert.strictEqual(formatDuration(500), '500 ms');
  assert.strictEqual(formatDuration(999), '999 ms');
});

test('formatDuration - formats seconds correctly', () => {
  assert.strictEqual(formatDuration(1000), '1s');
  assert.strictEqual(formatDuration(5000), '5s');
  assert.strictEqual(formatDuration(30000), '30s');
  assert.strictEqual(formatDuration(59000), '59s');
});

test('formatDuration - formats minutes correctly', () => {
  assert.strictEqual(formatDuration(60000), '1m 0s');
  assert.strictEqual(formatDuration(90000), '1m 30s');
  assert.strictEqual(formatDuration(3599000), '59m 59s');
});

test('formatDuration - formats hours correctly', () => {
  assert.strictEqual(formatDuration(3600000), '1h 0m 0s');
  assert.strictEqual(formatDuration(5400000), '1h 30m 0s');
  assert.strictEqual(formatDuration(7200000), '2h 0m 0s');
});

test('formatDuration - formats days correctly', () => {
  assert.strictEqual(formatDuration(86400000), '1d 0h 0m 0s');
  assert.strictEqual(formatDuration(172800000), '2d 0h 0m 0s');
  assert.strictEqual(formatDuration(90000000), '1d 1h 0m 0s');
});

test('formatDuration - omits zero segments appropriately', () => {
  const result = formatDuration(3661000); // 1h 1m 1s
  assert.ok(result.includes('1h'));
  assert.ok(result.includes('1m'));
  assert.ok(result.includes('1s'));
  assert.ok(!result.includes('0'));
});

test('formatPercent - handles zero and invalid values', () => {
  assert.strictEqual(formatPercent(0), '0%');
  assert.strictEqual(formatPercent(NaN), '0%');
  assert.strictEqual(formatPercent(Infinity), '0%');
});

test('formatPercent - formats percentages correctly', () => {
  assert.strictEqual(formatPercent(50), '50%');
  assert.strictEqual(formatPercent(100), '100%');
  assert.strictEqual(formatPercent(33.333), '33.33%');
  assert.strictEqual(formatPercent(0.5), '0.5%');
});

test('formatNumber - handles invalid values', () => {
  assert.strictEqual(formatNumber(NaN), '0');
  assert.strictEqual(formatNumber(Infinity), '0');
  assert.strictEqual(formatNumber(-Infinity), '0');
});

test('formatNumber - formats integers correctly', () => {
  assert.strictEqual(formatNumber(1000), '1,000');
  assert.strictEqual(formatNumber(1000000), '1,000,000');
  assert.strictEqual(formatNumber(42), '42');
});

test('formatNumber - formats decimals with custom precision', () => {
  const result = formatNumber(3.14159, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  assert.ok(result.includes('3.14'));
});

test('formatNumber - respects minimumFractionDigits option', () => {
  const result = formatNumber(5, { minimumFractionDigits: 2 });
  assert.ok(result.includes('5.00'));
});

test('escapeHtml - handles empty and null values', () => {
  assert.strictEqual(escapeHtml(''), '');
  assert.strictEqual(escapeHtml(), '');
  assert.strictEqual(escapeHtml(null), '');
});

test('escapeHtml - escapes basic HTML entities', () => {
  assert.strictEqual(escapeHtml('&'), '&amp;');
  assert.strictEqual(escapeHtml('<'), '&lt;');
  assert.strictEqual(escapeHtml('>'), '&gt;');
  assert.strictEqual(escapeHtml('"'), '&quot;');
  assert.strictEqual(escapeHtml("'"), '&#39;');
});

test('escapeHtml - escapes complex HTML content', () => {
  const input = '<script>alert("XSS")</script>';
  const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
  assert.strictEqual(escapeHtml(input), expected);
});

test('escapeHtml - handles mixed content', () => {
  const input = "Hello & 'World' <tag>";
  const result = escapeHtml(input);
  assert.ok(result.includes('&amp;'));
  assert.ok(result.includes('&#39;'));
  assert.ok(result.includes('&lt;'));
  assert.ok(result.includes('&gt;'));
});

test('escapeHtml - preserves safe text', () => {
  const input = 'Hello World 123';
  assert.strictEqual(escapeHtml(input), input);
});

test('safeJson - escapes < character for safe embedding', () => {
  const obj = { html: '<script>alert("xss")</script>' };
  const result = safeJson(obj);
  assert.ok(!result.includes('<script>'));
  assert.ok(result.includes('\\u003c'));
});

test('safeJson - handles objects correctly', () => {
  const obj = { name: 'test', value: 42 };
  const result = safeJson(obj);
  assert.ok(result.includes('"name"'));
  assert.ok(result.includes('"test"'));
  assert.ok(result.includes('42'));
});

test('safeJson - handles arrays correctly', () => {
  const arr = [1, 2, 3];
  const result = safeJson(arr);
  assert.ok(result.includes('[1,2,3]'));
});

test('percentile - handles empty array', () => {
  assert.strictEqual(percentile([], 50), 0);
});

test('percentile - calculates median correctly', () => {
  assert.strictEqual(percentile([1, 2, 3, 4, 5], 50), 3);
});

test('percentile - calculates 25th percentile', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = percentile(values, 25);
  assert.ok(result >= 2 && result <= 4);
});

test('percentile - calculates 75th percentile', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = percentile(values, 75);
  assert.ok(result >= 7 && result <= 9);
});

test('percentile - calculates 90th percentile', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = percentile(values, 90);
  assert.ok(result >= 9);
});

test('percentile - handles single element array', () => {
  assert.strictEqual(percentile([42], 50), 42);
  assert.strictEqual(percentile([42], 90), 42);
});

test('percentile - interpolates between values', () => {
  const values = [1, 2, 3, 4];
  const result = percentile(values, 50);
  assert.ok(result >= 2 && result <= 3);
});

test('formatDate - formats valid date strings', () => {
  const dateStr = '2025-10-12T10:00:00.000Z';
  const result = formatDate(dateStr);
  assert.ok(result.length > 0);
  assert.ok(typeof result === 'string');
});

test('formatDate - handles invalid dates gracefully', () => {
  const invalidDate = 'not-a-date';
  const result = formatDate(invalidDate);
  assert.strictEqual(result, invalidDate);
});

test('formatDate - formats ISO date strings', () => {
  const isoDate = new Date('2025-01-01T12:00:00Z').toISOString();
  const result = formatDate(isoDate);
  assert.ok(result.includes('2025'));
  assert.ok(result.includes('Jan') || result.includes('01'));
});

test('BYTE_UNITS - contains expected units', () => {
  assert.ok(Array.isArray(BYTE_UNITS));
  assert.ok(BYTE_UNITS.includes('B'));
  assert.ok(BYTE_UNITS.includes('KB'));
  assert.ok(BYTE_UNITS.includes('MB'));
  assert.ok(BYTE_UNITS.includes('GB'));
  assert.ok(BYTE_UNITS.includes('TB'));
  assert.ok(BYTE_UNITS.includes('PB'));
});

test('formatBytes - edge case: very small decimals', () => {
  const result = formatBytes(1.5);
  assert.ok(result.includes('B'));
});

test('formatPercent - edge case: very small percentages', () => {
  const result = formatPercent(0.001);
  assert.ok(result.includes('%'));
});

test('escapeHtml - edge case: multiple consecutive special chars', () => {
  const input = '&&&<<<>>>""\'\'\'"';
  const result = escapeHtml(input);
  assert.ok(result.includes('&amp;'));
  assert.ok(result.includes('&lt;'));
  assert.ok(result.includes('&gt;'));
  assert.ok(result.includes('&quot;'));
  assert.ok(result.includes('&#39;'));
});

test('formatDuration - edge case: exactly 1 hour', () => {
  const result = formatDuration(3600000);
  assert.ok(result.includes('1h'));
});

test('percentile - edge case: 0th percentile', () => {
  const values = [1, 2, 3, 4, 5];
  const result = percentile(values, 0);
  assert.strictEqual(result, 1);
});

test('percentile - edge case: 100th percentile', () => {
  const values = [1, 2, 3, 4, 5];
  const result = percentile(values, 100);
  assert.strictEqual(result, 5);
});

test('formatBytes - consistency across ranges', () => {
  // Test that formatting is consistent
  const sizes = [1, 1024, 1024*1024, 1024*1024*1024];
  sizes.forEach(size => {
    const result = formatBytes(size);
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });
});

test('formatNumber - handles negative numbers', () => {
  const result = formatNumber(-1000);
  assert.ok(result.includes('-1,000'));
});

test('formatDuration - handles fractional milliseconds', () => {
  const result = formatDuration(1.5);
  assert.ok(result.includes('ms'));
});