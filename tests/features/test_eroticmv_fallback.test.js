const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('FEATURE: Eroticmv Fallback', () => {
  const fs = require('fs');
  const path = require('path');
  const appJsPath = path.join(__dirname, '../../app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  assert.ok(appJsContent.includes('isAdult = details.adult === true'), 'app.js should contain EroticMV adult check');
  assert.ok(appJsContent.includes('erotica'), 'app.js should contain erotica keyword check');
  assert.ok(appJsContent.includes('Search on EroticMV'), 'app.js should contain Search on EroticMV pill text');
});
