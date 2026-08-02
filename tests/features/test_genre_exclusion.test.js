const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appJs = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');

test('FEATURE: Genre exclusion parameter building and per-mode state memory', () => {
  assert.ok(appJs.includes('exclude-genre-select'), 'app.js must reference exclude-genre-select element');
  assert.ok(appJs.includes('params.without_genres'), 'app.js must construct params.without_genres for TMDb API');
  assert.ok(appJs.includes('renderExcludedGenreChips'), 'app.js must define renderExcludedGenreChips');
  assert.ok(appJs.includes('populateExcludeGenreSelect'), 'app.js must define populateExcludeGenreSelect');
  const initMatch = appJs.match(/async function init\(\)[\s\S]*?\n\}/);
  assert.ok(initMatch && initMatch[0].includes('populateExcludeGenreSelect()'), 'init() must call populateExcludeGenreSelect() on page load');
  assert.ok(appJs.includes('excludedGenres: []'), 'modeCriteria must include excludedGenres array per mode');
});

test('STYLE: Excluded genre chip adapts to mode accent color', () => {
  const stylesCss = fs.readFileSync(path.join(__dirname, '../../styles.css'), 'utf8');
  const match = stylesCss.match(/\.excluded-genre-chip\s*\{([^}]+)\}/s);
  assert.ok(match, '.excluded-genre-chip CSS rule must exist in styles.css');
  const block = match[1];
  assert.ok(block.includes('var(--accent-primary-rgb)'), 'excluded-genre-chip must use var(--accent-primary-rgb)');
  assert.ok(block.includes('var(--accent-primary)'), 'excluded-genre-chip must use var(--accent-primary)');
});
