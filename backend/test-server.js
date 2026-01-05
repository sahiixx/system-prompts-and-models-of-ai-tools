const express = require('express');
const app = express();
const PORT = 5001;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test server running' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint works!' });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
