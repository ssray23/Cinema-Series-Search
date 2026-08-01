const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('getTitleMatchScore: Title relevance scoring hierarchy', () => {
  // Tier 4: Exact match
  assert.equal(core.getTitleMatchScore('Inception', 'Inception'), 4);

  // Tier 3: Starts-with prefix match
  assert.equal(core.getTitleMatchScore('Inception: Director Cut', 'Inception'), 3);

  // Tier 2: Substring match
  assert.equal(core.getTitleMatchScore('The Inception Story', 'Inception'), 2);

  // Tier 1: Fuzzy terms present
  assert.equal(core.getTitleMatchScore('Story of Inception and Dreams', 'Inception Dreams'), 1);

  // Tier 0: No match
  assert.equal(core.getTitleMatchScore('Matrix', 'Inception'), 0);
});

test('compareBySort: Sorting comparative logic', () => {
  const movieA = { title: 'Movie A', vote_count: 100, vote_average: 8.0, release_date: '2023-01-01' };
  const movieB = { title: 'Movie B', vote_count: 500, vote_average: 7.0, release_date: '2025-01-01' };

  // Popularity sort (vote_count.desc): movieB (500) > movieA (100)
  const popularSortResult = core.compareBySort(movieA, movieB, 'vote_count.desc', 'movie');
  assert.ok(popularSortResult > 0); // positive means movieB comes before movieA when sorting descending

  // Release date sort (primary_release_date.desc): movieB (2025) > movieA (2023)
  const dateSortResult = core.compareBySort(movieA, movieB, 'primary_release_date.desc', 'movie');
  assert.ok(dateSortResult > 0);
});
