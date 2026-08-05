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

test('isLikelyTvSeriesOrSpecial: Making of and Short film keywords', () => {
  const makingOfTitle = { title: 'The Talented Mr. Ripley: Making the Soundtrack', genre_ids: [99] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(makingOfTitle), true);

  const reflectionsTitle = { title: 'Reflections on The Talented Mr. Ripley', genre_ids: [99] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(reflectionsTitle), true);

  const shortFilmOverview = { title: 'Some Indie Movie', overview: 'This short film explores...', genre_ids: [18] };
  assert.equal(core.isLikelyTvSeriesOrSpecial(shortFilmOverview), true);
});

test('isLikelyTvSeriesOrSpecial: TMDb video flag', () => {
  const featurette = { title: 'Behind the Scenes', video: true };
  assert.equal(core.isLikelyTvSeriesOrSpecial(featurette), true);

  const normalMovie = { title: 'The Matrix', video: false };
  assert.equal(core.isLikelyTvSeriesOrSpecial(normalMovie), false);
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
