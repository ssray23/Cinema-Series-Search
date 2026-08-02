const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');

test('FEATURE: Independent per-mode search criteria retention across Cinema and Series', () => {
  assert.ok(appJs.includes('const modeCriteria'), 'app.js must define modeCriteria for storing independent movie & tv search state');
  assert.ok(appJs.includes('function saveCurrentModeCriteria()'), 'app.js must define saveCurrentModeCriteria');
  assert.ok(appJs.includes('function restoreModeCriteria(targetMode)'), 'app.js must define restoreModeCriteria');

  const modeToggleBlockMatch = appJs.match(/document\.querySelectorAll\('#mode-toggle \.segmented-option'\)[\s\S]*?\n\}\);/);
  assert.ok(modeToggleBlockMatch, 'mode-toggle listener block must exist in app.js');
  const block = modeToggleBlockMatch[0];

  assert.ok(block.includes('saveCurrentModeCriteria()'), 'mode toggle must save current mode criteria before switching');
  assert.ok(block.includes('restoreModeCriteria(currentMode)'), 'mode toggle must restore target mode criteria after switching');
});
