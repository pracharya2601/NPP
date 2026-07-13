'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const missing = ['repository', 'homepage', 'bugs'].filter(field => !packageJson[field]);

if (missing.length > 0) {
  throw new Error(
    `Refusing to publish: add real public repository metadata to package.json (${missing.join(', ')})`,
  );
}

const searchableFiles = [
  'package.json',
  'CHANGELOG.md',
  '.github/ISSUE_TEMPLATE/config.yml',
];
for (const file of searchableFiles) {
  const contents = fs.readFileSync(path.join(root, file), 'utf8');
  if (/OWNER|YOUR[_ -]?ORG|example\.com\/vendure-plugin-nepal-payments/i.test(contents)) {
    throw new Error(`Refusing to publish: replace repository placeholder in ${file}`);
  }
}

console.log('release repository metadata: ok');
