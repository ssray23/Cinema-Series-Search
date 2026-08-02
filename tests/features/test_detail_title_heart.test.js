const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const stylesCss = fs.readFileSync(path.join(__dirname, '../../styles.css'), 'utf8');

test('FEATURE: Detail dialog includes heart button directly in title header', () => {
  assert.ok(indexHtml.includes('id="dialog-heart-btn"'), 'dialog-heart-btn must be present in index.html');
  assert.ok(indexHtml.includes('class="dialog-title-wrapper"'), 'dialog-title-wrapper container must exist');
});

test('FEATURE: Detail dialog section titles & pills font sizes increased 20%', () => {
  // Title h2: 20px -> 24px
  const titleRule = stylesCss.match(/\.dialog-header\s+h2\s*\{([^}]+)\}/s);
  assert.ok(titleRule && titleRule[1].includes('font-size: 24px;'), '.dialog-header h2 font-size must be 24px (20% larger than 20px)');

  // Body h3: 12px -> 14.4px
  const bodyH3Rule = stylesCss.match(/\.dialog-body\s+h3\s*\{([^}]+)\}/s);
  assert.ok(bodyH3Rule && bodyH3Rule[1].includes('font-size: 14.4px;'), '.dialog-body h3 font-size must be 14.4px (20% larger than 12px)');

  // Details grid h4: 12px -> 14.4px
  const gridH4Rule = stylesCss.match(/\.dialog-details-grid\s+h4\s*\{([^}]+)\}/s);
  assert.ok(gridH4Rule && gridH4Rule[1].includes('font-size: 14.4px;'), '.dialog-details-grid h4 font-size must be 14.4px (20% larger than 12px)');

  // Providers section h3: 12px -> 14.4px
  const providersH3Rule = stylesCss.match(/\.dialog-providers-section\s+h3\s*\{([^}]+)\}/s);
  assert.ok(providersH3Rule && providersH3Rule[1].includes('font-size: 14.4px;'), '.dialog-providers-section h3 font-size must be 14.4px (20% larger than 12px)');

  // Genre pills: compact 0.72rem
  const genrePillRule = stylesCss.match(/\.genre-pill\s*\{([^}]+)\}/s);
  assert.ok(genrePillRule && genrePillRule[1].includes('font-size: 0.72rem;'), '.genre-pill font-size must be 0.72rem for compact display');
});

test('FEATURE: Detail heart button uses var(--accent-primary) (red for cinema, blue for series)', () => {
  const heartRule = stylesCss.match(/\.dialog-heart-btn\.hearted\s*\{([^}]+)\}/s);
  assert.ok(heartRule, '.dialog-heart-btn.hearted rule must exist in styles.css');
  assert.ok(heartRule[1].includes('var(--accent-primary)'), '.dialog-heart-btn.hearted must use var(--accent-primary)');

  const heartIconRule = stylesCss.match(/\.dialog-heart-btn\.hearted\s+i,\s*\.dialog-heart-btn\.hearted\s+svg\s*\{([^}]+)\}/s);
  assert.ok(heartIconRule, '.dialog-heart-btn.hearted i/svg rule must exist in styles.css');
  assert.ok(heartIconRule[1].includes('fill: var(--accent-primary)'), '.dialog-heart-btn.hearted i/svg fill must use var(--accent-primary)');
});
