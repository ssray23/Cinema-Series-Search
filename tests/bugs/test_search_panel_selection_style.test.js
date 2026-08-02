const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const universalCss = fs.readFileSync(path.join(__dirname, '../../universal-macos.css'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '../../styles.css'), 'utf8');

test('STYLE: Search panel selection uses var(--accent-primary) color and non-bold weight', () => {
  const match = universalCss.match(/\.select-wrapper\.has-value\s+select\.mac-input[^{]*\{([^}]+)\}/s);
  assert.ok(match, '.select-wrapper.has-value select.mac-input rule must exist in universal-macos.css');
  const block = match[1];
  assert.ok(block.includes('color: var(--accent-primary)'), 'Selection color must be var(--accent-primary) (red for movies, blue for series)');
  assert.ok(block.includes('font-weight: 400') || block.includes('font-weight: normal'), 'Selection font-weight must be non-bold (400/normal)');
  assert.ok(!block.includes('font-weight: 600') && !block.includes('font-weight: bold') && !block.includes('font-weight: 700'), 'Selection font-weight must NOT be bold');
});

test('STYLE: Selected person chip-name uses var(--accent-primary) color and non-bold weight', () => {
  const match = stylesCss.match(/\.chip-name\s*\{([^}]+)\}/s);
  assert.ok(match, '.chip-name rule must exist in styles.css');
  const block = match[1];
  assert.ok(block.includes('color: var(--accent-primary)'), 'Chip name color must be var(--accent-primary)');
  assert.ok(block.includes('font-weight: 400') || block.includes('font-weight: normal'), 'Chip name font-weight must be non-bold');
});
