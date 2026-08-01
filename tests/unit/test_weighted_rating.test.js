const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('weightedRating: Cinema mode threshold (15 votes)', () => {
  // High vote count (>= 15): un-dampened
  const itemHigh = { vote_count: 5000, vote_average: 8.4 };
  assert.equal(core.weightedRating(itemHigh, 'movie'), 8.4);

  // Exact threshold (15 votes)
  const itemExact = { vote_count: 15, vote_average: 7.5 };
  assert.equal(core.weightedRating(itemExact, 'movie'), 7.5);

  // Below threshold (3 votes out of 15): dampened linearly -> 7.5 * (3/15) = 1.5
  const itemLow = { vote_count: 3, vote_average: 7.5 };
  assert.equal(core.weightedRating(itemLow, 'movie'), 1.5);

  // Zero votes: 0
  const itemZero = { vote_count: 0, vote_average: 9.0 };
  assert.equal(core.weightedRating(itemZero, 'movie'), 0);
});

test('weightedRating: Series mode threshold (5 votes)', () => {
  // Exact threshold (5 votes)
  const itemExact = { vote_count: 5, vote_average: 8.0 };
  assert.equal(core.weightedRating(itemExact, 'tv'), 8.0);

  // Below threshold (2 votes out of 5): dampened -> 8.0 * (2/5) = 3.2
  const itemLow = { vote_count: 2, vote_average: 8.0 };
  assert.equal(core.weightedRating(itemLow, 'tv'), 3.2);
});
