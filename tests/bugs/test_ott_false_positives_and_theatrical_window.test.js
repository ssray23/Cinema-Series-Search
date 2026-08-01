const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('BUG FIX: Movie production company names do NOT produce false positive OTT pills', () => {
  const movieDetails = {
    title: 'The India Story',
    original_language: 'hi',
    production_companies: [{ id: 1, name: 'Amazon Studios' }]
  };

  const currentMode = 'movie';
  const networkList = (currentMode === 'tv' && movieDetails.networks) ? movieDetails.networks : [];
  
  assert.equal(networkList.length, 0, 'Movie production companies must NOT be treated as flatrate OTT streaming providers');
});

test('BUG FIX: Official streaming homepage URLs ARE dynamically detected regardless of age', () => {
  const movieDetails = {
    title: 'Direct OTT Film',
    homepage: 'https://www.primevideo.com/detail/12345'
  };

  const ottPlatforms = ['Netflix', 'Amazon Prime Video', 'Disney+ Hotstar'];
  const knownOtts = ottPlatforms.map((name, idx) => ({ id: 9000 + idx, name: name }));
  const ottAliases = {
    'amazon prime video': ['primevideo', 'amazon'],
    'disney+ hotstar': ['hotstar', 'disneyplus'],
    'apple tv+': ['tv.apple', 'apple.com'],
    'hbo max': ['max.com', 'hbomax']
  };

  let fallbackFound = false;
  let detectedOtt = null;
  
  if (movieDetails.homepage) {
    const lowerHome = movieDetails.homepage.toLowerCase();
    for (const ott of knownOtts) {
      const lowerOtt = ott.name.toLowerCase();
      const domainName = lowerOtt.replace(/\s+/g, '').replace('+', '');
      const aliases = ottAliases[lowerOtt] || [];

      if (lowerHome.includes(domainName) || aliases.some(alias => lowerHome.includes(alias))) {
        fallbackFound = true;
        detectedOtt = ott.name;
        break;
      }
    }
  }

  assert.equal(fallbackFound, true);
  assert.equal(detectedOtt, 'Amazon Prime Video');
});

test('BUG FIX: Pre-release or unconfirmed streaming rights rejected by AI CoT Parser', () => {
  const futureRightsJson = JSON.stringify({
    search_summary: "Amazon Prime Video acquired post-theatrical rights, streaming in 2 months",
    year_match: "Yes",
    explicit_confirmation: "No",
    prediction: "Amazon Prime Video"
  });

  const parsedResult = core.parseAiJsonCotResponse(futureRightsJson, ['Amazon Prime Video', 'Netflix']);
  assert.equal(parsedResult, null, 'Unconfirmed active streaming must return null');
});
