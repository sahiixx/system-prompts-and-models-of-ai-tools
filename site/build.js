#!/usr/bin/env node

try {
  const { run } = require('./lib/builder');
  run();
} catch (error) {
  console.error('❌ Build failed to start:', error);
  process.exit(1);
}
