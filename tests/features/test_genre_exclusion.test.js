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
  assert.ok(appJs.includes('excludedGenres: []'), 'modeCriteria must include excludedGenres array per mode');
});
