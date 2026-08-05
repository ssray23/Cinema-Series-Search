const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('FEATURE: Datamuse API Fallback Integration', async (t) => {
  // Mock global fetch
  const originalFetch = global.fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  // Test 1: Fetch a word that has related words in our dictionary
  // e.g., 'giggle' -> datamuse returns 'laughing' -> maps to comedy '35'
  await t.test('Successfully maps unknown word via Datamuse synonyms (giggle -> Comedy)', async () => {
    global.fetch = async (url) => {
      assert.ok(url.includes('ml=giggle'), 'Should query datamuse with giggle');
      return {
        ok: true,
        json: async () => [
          { word: 'titter' },
          { word: 'snicker' },
          { word: 'laughing' }, 
          { word: 'laugh' }
        ]
      };
    };

    const mappedGenreId = await core.getDatamuseGenreMapping('giggle', 'movie');
    assert.strictEqual(mappedGenreId, '35', 'Should resolve to Comedy genre ID (35)');
  });

  // Test 2: Network failure returns null gracefully
  await t.test('Gracefully handles network errors', async () => {
    global.fetch = async () => {
      throw new Error('Network error');
    };

    const mappedGenreId = await core.getDatamuseGenreMapping('someerrorword', 'movie');
    assert.strictEqual(mappedGenreId, null, 'Should return null on network error');
  });

  // Test 3: No matching synonyms
  await t.test('Returns null if Datamuse words do not match dictionary', async () => {
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => [
          { word: 'randomword1' },
          { word: 'randomword2' }
        ]
      };
    };

    const mappedGenreId = await core.getDatamuseGenreMapping('unknown', 'movie');
    assert.strictEqual(mappedGenreId, null, 'Should return null if no dictionary match');
  });
});
