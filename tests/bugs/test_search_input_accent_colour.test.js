const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../../styles.css');
const CSS = fs.readFileSync(cssPath, 'utf8');

// ── Search Input Placeholder Fix ─────────────────────────────────────────────
test('BUG FIX: Search inputs use mode accent color only when text is typed', () => {
  // 1. Verify the typed text rule uses :not(:placeholder-shown) and var(--accent-primary)
  const typedRule = CSS.match(/\.search-panel input\[type="text"\]:not\(:placeholder-shown\)\s*\{([^}]+)\}/s);
  assert.ok(typedRule, '.search-panel input[type="text"]:not(:placeholder-shown) rule must exist in styles.css');
  assert.ok(typedRule[1].includes('var(--accent-primary)'), 'The rule must set color to var(--accent-primary)');

  // 2. Verify that there is NO rule aggressively setting the ::placeholder color to red
  // We want to ensure we don't regress into the bug where placeholders are red.
  const badPlaceholderRule = CSS.match(/\.search-panel input\[type="text"\]::placeholder\s*\{([^}]+)\}/s);
  if (badPlaceholderRule) {
    assert.ok(!badPlaceholderRule[1].includes('var(--accent-primary)'), 'The placeholder must NOT be set to the accent color');
  }
});
