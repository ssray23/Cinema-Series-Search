const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('FEATURE: Semantic Genre Mapping', () => {
  // Test movie mode mappings
  assert.strictEqual(core.getSemanticGenreMapping('funny', 'movie'), '35', 'funny -> Comedy (movie)');
  assert.strictEqual(core.getSemanticGenreMapping('action', 'movie'), '28', 'action -> Action (movie)');
  assert.strictEqual(core.getSemanticGenreMapping('mindfuck', 'movie'), '878,53,9648', 'mindfuck -> Sci-Fi,Thriller,Mystery (movie)');
  
  // Test series mode mappings (should translate IDs)
  assert.strictEqual(core.getSemanticGenreMapping('funny', 'tv'), '35', 'funny -> Comedy (tv)'); // Same
  assert.strictEqual(core.getSemanticGenreMapping('action', 'tv'), '10759', 'action -> Action & Adventure (tv)');
  assert.strictEqual(core.getSemanticGenreMapping('mindfuck', 'tv'), '10765,9648,9648', 'mindfuck -> translated to TV genres'); // Sci-Fi(878)->10765, Thriller(53)->9648, Mystery(9648)->9648
  
  // Unknown
  assert.strictEqual(core.getSemanticGenreMapping('unknownword', 'movie'), null);
});
