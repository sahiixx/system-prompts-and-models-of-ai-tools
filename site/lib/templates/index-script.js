const searchDataElement = document.getElementById('search-data');
const searchInput = document.querySelector('[data-search]');
const resultsBody = document.querySelector('[data-search-results]');
const resultsMeta = document.querySelector('[data-search-count]');
const themeToggle = document.querySelector('[data-theme-toggle]');

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
      <td><a href="files/${item.id}.html">${item.path}</a></td>
      <td>${item.extension}</td>
      <td>${item.sizeHuman}</td>
      <td>${item.lines ?? '—'}</td>
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
