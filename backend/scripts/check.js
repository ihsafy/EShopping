'use strict';

/**
 * Loads every backend module to catch syntax/import errors before boot.
 * Usage: node scripts/check.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const roots = [path.join(__dirname, '..', 'src'), path.join(__dirname, '..', 'scripts')];
const files = [];

const walk = (dir) => {
  fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) files.push(full);
  });
};

roots.forEach(walk);

let failed = 0;
files.forEach((file) => {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (error) {
    failed += 1;
    const message = error.stderr ? error.stderr.toString().split('\n').slice(0, 4).join('\n') : error.message;
    console.error(`\n✖ ${path.relative(path.join(__dirname, '..'), file)}\n${message}`);
  }
});

if (failed) {
  console.error(`\n${failed} file(s) failed to parse.`);
  process.exit(1);
}
console.log(`✔ ${files.length} backend files parse cleanly.`);
