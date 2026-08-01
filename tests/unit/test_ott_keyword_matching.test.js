const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('matchesOttKeyword: Word-boundary matching', () => {
  // Should match "max" as standalone word in "HBO Max Films"
  assert.equal(core.matchesOttKeyword('HBO Max Films', 'max'), true);

  // Should NOT match "max" embedded inside "Maximilian Films Ltd."
  assert.equal(core.matchesOttKeyword('Maximilian Films Ltd.', 'max'), false);

  // Should match "netflix" in "Netflix Originals"
  assert.equal(core.matchesOttKeyword('Netflix Originals', 'netflix'), true);

  // Null / empty safeguards
  assert.equal(core.matchesOttKeyword('', 'netflix'), false);
  assert.equal(core.matchesOttKeyword('Netflix', ''), false);
});
