const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('isLikelyTvSeriesOrSpecial: TV Movie genre (10770)', () => {
  const movie = { title: 'Some Movie', genre_ids: [18, 10770] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(movie), true);
});

test('isLikelyTvSeriesOrSpecial: Runtime under 40m gate', () => {
  const shortFilm = { title: 'A Short Story', runtime: 15, genre_ids: [18] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(shortFilm), true);

  const featureFilm = { title: 'A Long Story', runtime: 110, genre_ids: [18] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(featureFilm), false);
});

test('isLikelyTvSeriesOrSpecial: Stand-up & TV special keywords in title & overview', () => {
  const standupTitle = { title: 'Live Comedy Special', overview: 'A fun night' };
  assert.equal(core.isLikelyTvSeriesOrSpecial(standupTitle), true);

  const standupOverview = { title: 'Laugh Out Loud', overview: 'In this special, comedian shares stories' };
  assert.equal(core.isLikelyTvSeriesOrSpecial(standupOverview), true);
});

test('isLikelyTvSeriesOrSpecial: S01E01 pattern in title', () => {
  const episode = { title: 'Awesome Show S01E05', overview: 'Episode 5 description' };
  assert.equal(core.isLikelyTvSeriesOrSpecial(episode), true);
});

test('isLikelyTvSeriesOrSpecial: Colon with empty genre_ids', () => {
  const specialEvent = { title: 'Munawar Faruqui: Dhandho', genre_ids: [] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(specialEvent), true);

  const realMovieWithColon = { title: 'Mission: Impossible', genre_ids: [28, 53] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(realMovieWithColon), false);
});
