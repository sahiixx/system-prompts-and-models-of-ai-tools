const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ai-tools-hub')
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Failed to connect:', err.message);
    process.exit(1);
  });

setTimeout(() => {
  console.log('⏱️  Timeout - connection taking too long');
  process.exit(1);
}, 5000);
