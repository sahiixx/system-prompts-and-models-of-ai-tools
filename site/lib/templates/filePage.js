const { escapeHtml, formatBytes, formatDate } = require('../formatters');

const FILE_PAGE_STYLES = `
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
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px 20px 64px;
  }

  header {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 16px;
  }

  .breadcrumbs {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .breadcrumbs a {
    color: var(--accent);
    text-decoration: none;
  }

  .breadcrumbs a:hover {
    text-decoration: underline;
  }

  h1 {
    font-size: 1.75rem;
    margin: 0;
    color: var(--accent);
    font-weight: 600;
  }

  .control-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .btn {
    border: 1px solid var(--border-color);
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 8px 14px;
    font-size: 0.875rem;
    border-radius: 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .btn:hover {
    background: var(--bg-tertiary);
  }

  .btn:active {
    transform: translateY(1px);
  }

  .file-meta {
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 20px;
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    box-shadow: 0 12px 30px -16px var(--shadow);
  }

  .file-meta dt {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
  }

  .file-meta dd {
    margin: 4px 0 0;
    font-size: 0.95rem;
    font-weight: 500;
  }

  .code-wrapper {
    position: relative;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    overflow: hidden;
    background: var(--bg-secondary);
  }

  pre {
    margin: 0;
    max-height: calc(80vh - 120px);
    overflow: auto;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.85rem;
    line-height: 1.55;
    padding: 24px;
    white-space: pre;
  }

  pre.wrap {
    white-space: pre-wrap;
    word-break: break-word;
  }

  footer {
    margin-top: 40px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    text-align: center;
  }

  footer a {
    color: var(--accent);
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
  }
`;

const FILE_PAGE_SCRIPT = `
  const themeToggle = document.querySelector('[data-theme-toggle]');
  const codeBlock = document.querySelector('pre');
  const wrapToggle = document.querySelector('[data-wrap-toggle]');
  const copyButton = document.querySelector('[data-copy-button]');

  const preferredTheme = localStorage.getItem('builder:theme');
  if (preferredTheme) {
    document.documentElement.dataset.theme = preferredTheme;
  } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.dataset.theme = 'light';
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('builder:theme', theme);
  }

  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    themeToggle.textContent = nextTheme === 'light' ? '🌙 Dark mode' : '☀️ Light mode';
  });

  wrapToggle?.addEventListener('click', () => {
    codeBlock?.classList.toggle('wrap');
    const wrapped = codeBlock?.classList.contains('wrap');
    wrapToggle.textContent = wrapped ? '↩️ Disable wrapping' : '↩️ Enable wrapping';
  });

  if (window.hljs) {
    document.querySelectorAll('pre code').forEach(block => window.hljs.highlightElement(block));
  }

  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeBlock?.textContent || '');
      copyButton.textContent = '✅ Copied';
      setTimeout(() => {
        copyButton.textContent = '📋 Copy';
      }, 1500);
    } catch (error) {
      console.warn('Unable to copy file contents', error);
    }
  });
`;

function renderFilePage(file, content) {
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const safeContent = escapeHtml(content);

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(file.relativePath)} · System Prompts</title>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css" integrity="sha512-uXUrJzi10BGSAdoo6gWQBaIj++ImQxGc1dQc5sKXc5teLoI0lp4rWuIwoMvVJE9idh+NROm4tW7x1YgnSUZXTA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js" integrity="sha512-DQxFrqxbPjzvY4xXHzkwmo7aX6ixkmKuuNHYsYvwdivgLPgAvFp8ZUBKbjsggq09uXBJgp7wa9u0edPFpKnz0w==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <style>${FILE_PAGE_STYLES}</style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <h1>${escapeHtml(file.name)}</h1>
        <nav class="breadcrumbs">
          <a href="../index.html">Home</a>
          <span> / </span>
          <span>${escapeHtml(file.relativePath)}</span>
        </nav>
      </div>
      <div class="control-bar">
        <button class="btn" data-theme-toggle type="button">☀️ Light mode</button>
        <button class="btn" data-wrap-toggle type="button">↩️ Enable wrapping</button>
        <button class="btn" data-copy-button type="button">📋 Copy</button>
        <a class="btn" href="../index.html">🏠 Index</a>
      </div>
    </header>

    <dl class="file-meta">
      <div>
        <dt>Path</dt>
        <dd>${escapeHtml(file.relativePath)}</dd>
      </div>
      <div>
        <dt>Size</dt>
        <dd>${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)</dd>
      </div>
      <div>
        <dt>Lines</dt>
        <dd>${lineCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Extension</dt>
        <dd>${escapeHtml(file.extension || 'n/a')}</dd>
      </div>
      <div>
        <dt>Updated</dt>
        <dd>${formatDate(file.modifiedAt)}</dd>
      </div>
      <div>
        <dt>Created</dt>
        <dd>${formatDate(file.createdAt)}</dd>
      </div>
    </dl>

    <div class="code-wrapper">
      <pre><code class="language-${escapeHtml(file.language || 'plaintext')}">${safeContent}</code></pre>
    </div>

    <footer>
      <p>Generated automatically from the repository snapshot. Return to the <a href="../index.html">index</a>.</p>
    </footer>
  </div>
  <script>${FILE_PAGE_SCRIPT}</script>
</body>
</html>`;
}

module.exports = { renderFilePage };
