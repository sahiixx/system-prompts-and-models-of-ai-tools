const fs = require('fs');
const path = require('path');

const {
  escapeHtml,
  formatBytes,
  formatDuration,
  formatPercent,
  formatNumber,
  safeJson
} = require('../formatters');

const INDEX_STYLES = `
  :root {
    color-scheme: dark light;
    --bg-primary: #0d1117;
    --bg-secondary: #161b22;
    --bg-tertiary: #1f2937;
    --border-color: #30363d;
    --text-primary: #c9d1d9;
    --text-secondary: #8b949e;
    --accent: #58a6ff;
    --shadow: rgba(15, 23, 42, 0.35);
    --success: #3fb950;
    --warning: #d29922;
  }

  [data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f6f8fa;
    --bg-tertiary: #eaeef2;
    --border-color: #d0d7de;
    --text-primary: #24292f;
    --text-secondary: #57606a;
    --accent: #0969da;
    --shadow: rgba(15, 23, 42, 0.1);
    --success: #1a7f37;
    --warning: #9a6700;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: "Inter", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
  }

  .page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 24px 20px 80px;
  }

  header {
    background: linear-gradient(135deg, rgba(88,166,255,0.12), rgba(88,166,255,0.32));
    border: 1px solid rgba(88,166,255,0.4);
    border-radius: 18px;
    padding: 32px 28px;
    margin-bottom: 32px;
    box-shadow: 0 18px 48px -24px var(--shadow);
  }

  header h1 {
    margin: 0 0 12px;
    font-size: 2rem;
    font-weight: 600;
    color: var(--accent);
  }

  header p {
    margin: 0;
    color: var(--text-secondary);
  }

  .generated-meta {
    margin-top: 16px;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 16px;
    margin-bottom: 32px;
  }

  .btn {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 8px 16px;
    border-radius: 10px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .btn:hover {
    background: var(--bg-tertiary);
  }

  .btn:active {
    transform: translateY(1px);
  }

  .metric-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    box-shadow: 0 14px 36px -28px var(--shadow);
  }

  .metric-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  .metric-value {
    font-size: 1.6rem;
    font-weight: 600;
  }

  .metric-subtext {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .section {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 28px;
    box-shadow: 0 14px 36px -26px var(--shadow);
  }

  .section h2 {
    margin: 0 0 8px;
    font-size: 1.25rem;
    color: var(--accent);
  }

  .section p {
    margin: 0 0 16px;
    color: var(--text-secondary);
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  tbody tr:hover {
    background: var(--bg-tertiary);
  }

  .histogram {
    display: grid;
    gap: 8px;
  }

  .histogram-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .histogram-row span {
    width: 160px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  .histogram-bar {
    flex: 1;
    background: var(--bg-tertiary);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }

  .histogram-bar::after {
    content: '';
    display: block;
    height: 12px;
    background: linear-gradient(90deg, var(--accent), rgba(88,166,255,0.4));
    width: var(--percent, 0%);
  }

  .tree {
    display: grid;
    gap: 12px;
  }

  .tree details {
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 12px 16px;
    background: var(--bg-secondary);
  }

  .tree summary {
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  }

  .summary-meta {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .file-list {
    margin: 12px 0 0;
    padding-left: 18px;
    list-style: none;
    display: grid;
    gap: 6px;
  }

  .file-link {
    color: var(--text-primary);
    text-decoration: none;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 8px;
    border-radius: 8px;
  }

  .file-link:hover {
    background: var(--bg-tertiary);
    color: var(--accent);
  }

  .search-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 16px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .search-bar input {
    flex: 1;
    min-width: 240px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    padding: 12px 14px;
    font-size: 1rem;
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }

  .search-meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
    align-self: center;
  }

  footer {
    margin-top: 48px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  footer a {
    color: var(--accent);
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
  }
`;

function renderMetrics(report) {
  const metrics = [
    {
      label: 'Files indexed',
      value: report.totalFiles.toLocaleString(),
      subtext: `${formatBytes(report.averageFileSizeBytes)} avg`
    },
    {
      label: 'Directories',
      value: report.totalDirectories.toLocaleString(),
      subtext: `${formatNumber(report.averageFilesPerDirectory)} files avg`
    },
    {
      label: 'Generated pages',
      value: report.generatedPages.toLocaleString(),
      subtext: `${formatDuration(report.durationMs)}`
    },
    {
      label: 'Repository footprint',
      value: formatBytes(report.totalSizeBytes),
      subtext: `${formatBytes(report.bytesPerSecond)} / s throughput`
    },
    {
      label: 'Median file size',
      value: formatBytes(report.sizeMetrics.median),
      subtext: `p95 ${formatBytes(report.sizeMetrics.p95)}`
    },
    {
      label: 'Lines processed',
      value: report.lineMetrics.totalLines.toLocaleString(),
      subtext: `${formatNumber(report.lineMetrics.averageLines)} avg`
    }
  ];

  return metrics.map(metric => `
    <article class="metric-card">
      <span class="metric-label">${metric.label}</span>
      <span class="metric-value">${metric.value}</span>
      <span class="metric-subtext">${metric.subtext}</span>
    </article>
  `).join('');
}

function renderHistogram(buckets, totalFiles) {
  if (!buckets.length) {
    return '<p>No file size samples available.</p>';
  }

  return `
    <div class="histogram">
      ${buckets.map(bucket => {
        const percent = totalFiles ? Math.max(2, Math.round((bucket.count / totalFiles) * 100)) : 0;
        return `
          <div class="histogram-row">
            <span>${escapeHtml(bucket.label)}</span>
            <div class="histogram-bar" style="--percent: ${percent}%"></div>
            <span>${bucket.count.toLocaleString()} files</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDirectoryTable(directories) {
  if (!directories.length) {
    return '<p>No directory statistics available.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Directory</th>
          <th>Files</th>
          <th>Total size</th>
          <th>Average size</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        ${directories.map(directory => `
          <tr>
            <td>${escapeHtml(directory.directory)}</td>
            <td>${directory.files.toLocaleString()}</td>
            <td>${directory.totalSizeHuman}</td>
            <td>${directory.averageFileSizeHuman}</td>
            <td>${formatPercent(directory.sizeSharePercent)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderExtensionTable(extensions) {
  if (!extensions.length) {
    return '<p>No extension statistics available.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Extension</th>
          <th>Files</th>
          <th>Total size</th>
          <th>Average size</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>
        ${extensions.map(extension => `
          <tr>
            <td>${escapeHtml(extension.extension || 'n/a')}</td>
            <td>${extension.files.toLocaleString()}</td>
            <td>${extension.totalSizeHuman}</td>
            <td>${extension.averageFileSizeHuman}</td>
            <td>${formatPercent(extension.sizeSharePercent)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderFileTable(files) {
  if (!files.length) {
    return '<p>No file samples available.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>File</th>
          <th>Size</th>
          <th>Lines</th>
          <th>Bytes</th>
        </tr>
      </thead>
      <tbody>
        ${files.map(file => `
          <tr>
            <td>${escapeHtml(file.path)}</td>
            <td>${file.sizeHuman}</td>
            <td>${file.lines?.toLocaleString?.() || '—'}</td>
            <td>${file.bytes.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderTree(node) {
  const childDirectories = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
  const files = node.files.slice().sort((a, b) => a.name.localeCompare(b.name));
  const label = node.depth === 0 ? 'Repository root' : node.relativePath;
  const summaryMeta = `${node.totalFiles.toLocaleString()} files • ${formatBytes(node.totalBytes)}`;

  const fileItems = files.length
    ? `<ul class="file-list">
        ${files.map(file => `
          <li>
            <a class="file-link" href="files/${file.id}.html">
              <span>${escapeHtml(file.name)}</span>
              <span>${formatBytes(file.size)}</span>
            </a>
          </li>
        `).join('')}
      </ul>`
    : '';

  const childrenMarkup = childDirectories.map(child => renderTree(child)).join('');

  return `
    <details class="tree-node" ${node.depth < 2 ? 'open' : ''}>
      <summary>
        <span>${escapeHtml(label)}</span>
        <span class="summary-meta">${summaryMeta}</span>
      </summary>
      ${fileItems}
      ${childrenMarkup}
    </details>
  `;
}

const INDEX_SCRIPT = fs.readFileSync(path.join(__dirname, 'index-script.js'), 'utf8');

function renderIndexPage({ report, rootNode, searchIndex }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Prompts · Repository Atlas</title>
  <style>${INDEX_STYLES}</style>
</head>
<body>
  <div class="page">
    <header>
      <h1>System Prompts &amp; AI Tools Atlas</h1>
      <p>A richly instrumented catalogue of prompts, configuration files, and reference guides.</p>
      <div class="generated-meta">Generated ${escapeHtml(report.generatedHuman)} · Node ${escapeHtml(report.runtime.node)} · ${report.totalFiles.toLocaleString()} tracked files</div>
      <div style="margin-top:16px;">
        <button class="btn" data-theme-toggle type="button">☀️ Light mode</button>
      </div>
    </header>

    <section class="metrics-grid">
      ${renderMetrics(report)}
    </section>

    <section class="section">
      <h2>Realtime file lookup</h2>
      <p>Search across every generated page and jump directly to the content you need.</p>
      <div class="search-bar">
        <input type="search" placeholder="Filter files by path, directory, or extension" data-search />
        <span class="search-meta" data-search-count></span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Extension</th>
              <th>Size</th>
              <th>Lines</th>
            </tr>
          </thead>
          <tbody data-search-results></tbody>
        </table>
      </div>
    </section>

    <section class="section">
      <h2>Extension breakdown</h2>
      <p>File type distribution across the repository snapshot.</p>
      ${renderExtensionTable(report.extensionBreakdown)}
    </section>

    <section class="section">
      <h2>Directory insights</h2>
      <p>High-impact directories ranked by total footprint.</p>
      ${renderDirectoryTable(report.largestDirectories)}
    </section>

    <section class="section">
      <h2>Largest files</h2>
      <p>The heaviest artefacts committed to the repository.</p>
      ${renderFileTable(report.largestFiles)}
    </section>

    <section class="section">
      <h2>Size distribution</h2>
      <p>How files group by byte ranges.</p>
      ${renderHistogram(report.sizeDistribution, report.totalFiles)}
    </section>

    <section class="section">
      <h2>Repository map</h2>
      <p>Explore the generated pages by directory hierarchy.</p>
      <div class="tree">
        ${renderTree(rootNode)}
      </div>
    </section>

    <footer>
      <p>Generated in ${formatDuration(report.durationMs)} · Build throughput ${formatNumber(report.filesPerSecond, { maximumFractionDigits: 1 })} files/sec</p>
      <p>View the <a href="build-report.json">build report</a> for the complete analytics payload.</p>
    </footer>
  </div>
  <script id="search-data" type="application/json">${safeJson({ files: searchIndex })}</script>
  <script>${INDEX_SCRIPT}</script>
</body>
</html>`;
}

module.exports = { renderIndexPage };
