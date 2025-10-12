const searchDataElement = document.getElementById('search-data');
const searchInput = document.querySelector('[data-search]');
const resultsBody = document.querySelector('[data-search-results]');
const resultsMeta = document.querySelector('[data-search-count]');
const themeToggle = document.querySelector('[data-theme-toggle]');

// Escape meta-characters in text for safe insertion into HTML
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const dataset = JSON.parse(searchDataElement.textContent);
const files = dataset.files;

const storedTheme = localStorage.getItem('builder:theme');
if (storedTheme) {
  document.documentElement.dataset.theme = storedTheme;
} else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  document.documentElement.dataset.theme = 'light';
}

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = nextTheme;
  localStorage.setItem('builder:theme', nextTheme);
  themeToggle.textContent = nextTheme === 'light' ? '🌙 Dark mode' : '☀️ Light mode';
});

function renderRows(items) {
  resultsBody.innerHTML = items.map(item => `
    <tr>
      <td><a href="files/${escapeHTML(item.id)}.html">${escapeHTML(item.path)}</a></td>
      <td>${escapeHTML(item.extension)}</td>
      <td>${escapeHTML(item.sizeHuman)}</td>
      <td>${item.lines != null ? escapeHTML(item.lines) : '—'}</td>
    </tr>
  `).join('');
  resultsMeta.textContent = `${items.length.toLocaleString()} / ${files.length.toLocaleString()} files`;
}

function filterFiles(query) {
  if (!query) {
    return files.slice(0, 100);
  }
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return files.filter(file => terms.every(term => file.pathLower.includes(term))).slice(0, 200);
}

searchInput?.addEventListener('input', event => {
  const value = event.target.value.trim();
  renderRows(filterFiles(value));
});

renderRows(filterFiles(''));
