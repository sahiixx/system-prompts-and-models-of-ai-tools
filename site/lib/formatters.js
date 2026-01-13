const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
const integerFormatter = new Intl.NumberFormat('en-US');
const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  const formatted = value >= 100
    ? integerFormatter.format(Math.round(value))
    : decimalFormatter.format(value);

  return `${formatted} ${BYTE_UNITS[exponent]}`;
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return '0 ms';
  }

  const totalSeconds = Math.round(milliseconds / 1000);
  if (totalSeconds < 1) {
    return `${milliseconds.toFixed(0)} ms`;
  }

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const days = Math.floor(totalSeconds / 86400);

  const segments = [];
  if (days) segments.push(`${days}d`);
  if (hours) segments.push(`${hours}h`);
  if (minutes) segments.push(`${minutes}m`);
  if (!segments.length || seconds) segments.push(`${seconds}s`);

  return segments.join(' ');
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return '0%';
  }
  return `${decimalFormatter.format(value)}%`;
}

function formatNumber(value, { minimumFractionDigits = 0, maximumFractionDigits = 2 } = {}) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits, maximumFractionDigits }).format(value);
}

function escapeHtml(text = '') {
  return text.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) {
    return 0;
  }
  const index = (percentileValue / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }
  const weight = index - lowerIndex;
  return Math.round(sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight);
}

function formatDate(value) {
  try {
    return dateTimeFormatter.format(new Date(value));
  } catch (error) {
    return value;
  }
}

module.exports = {
  BYTE_UNITS,
  formatBytes,
  formatDuration,
  formatPercent,
  formatNumber,
  escapeHtml,
  safeJson,
  percentile,
  formatDate
};
