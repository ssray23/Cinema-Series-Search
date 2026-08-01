const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '../../styles.css'), 'utf8');

// ── .card-watchlist-btn.hearted background rule ───────────────────────────────
test('BUG FIX: .hearted uses var(--accent-primary) for color, not hardcoded red', () => {
  const match = CSS.match(/\.card-watchlist-btn\.hearted\s*\{([^}]+)\}/s);
  assert.ok(match, '.card-watchlist-btn.hearted rule must exist in styles.css');
  const block = match[1];
  assert.ok(block.includes('var(--accent-primary)'),
    'color must be var(--accent-primary) so it adapts to Cinema/Series mode');
  assert.ok(!block.includes('var(--red)'),
    'color must NOT be var(--red) — that is hardcoded and mode-unaware');
  assert.ok(!block.includes('rgb(239') && !block.includes('rgba(239'),
    'border-color must NOT use hardcoded rgba(239,68,68) red');
});

// ── .hearted i / svg fill rule ────────────────────────────────────────────────
test('BUG FIX: .hearted i/svg fill uses var(--accent-primary), not hardcoded red', () => {
  const match = CSS.match(/\.card-watchlist-btn\.hearted\s+i,\s*\.card-watchlist-btn\.hearted\s+svg\s*\{([^}]+)\}/s);
  assert.ok(match, '.card-watchlist-btn.hearted i/svg rule must exist in styles.css');
  const block = match[1];
  assert.ok(block.includes('var(--accent-primary)'),
    'fill must use var(--accent-primary)');
  assert.ok(!block.includes('var(--red)'),
    'fill must NOT use var(--red)');
});

// ── Cinema mode RGB variable ──────────────────────────────────────────────────
test('FEATURE: Cinema mode body defines --accent-primary-rgb as 227,24,55 (red)', () => {
  // Must appear in the body { } block, not just body.series-mode
  const bodyBlock = CSS.match(/^body\s*\{([^}]+)\}/ms);
  assert.ok(bodyBlock, 'body {} rule must exist');
  assert.ok(bodyBlock[1].includes('--accent-primary-rgb: 227, 24, 55'),
    'Cinema mode must declare --accent-primary-rgb: 227, 24, 55 for rgba() borders');
});

// ── Series mode RGB variable ──────────────────────────────────────────────────
test('FEATURE: Series mode defines --accent-primary-rgb as 0,114,198 (blue)', () => {
  const seriesBlock = CSS.match(/body\.series-mode\s*\{([^}]+)\}/s);
  assert.ok(seriesBlock, 'body.series-mode {} rule must exist');
  assert.ok(seriesBlock[1].includes('--accent-primary-rgb: 0, 114, 198'),
    'Series mode must declare --accent-primary-rgb: 0, 114, 198 for rgba() borders');
});
