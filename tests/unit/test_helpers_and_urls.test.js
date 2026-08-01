const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('detectWatchRegion: Language and Timezone mapping', () => {
  // Indian language override
  assert.equal(core.detectWatchRegion('hi'), 'IN');
  assert.equal(core.detectWatchRegion('bn'), 'IN');
  assert.equal(core.detectWatchRegion('ta'), 'IN');

  // Timezone explicit mapping
  assert.equal(core.detectWatchRegion('en', 'Asia/Kolkata'), 'IN');
  assert.equal(core.detectWatchRegion('en', 'Europe/London'), 'GB');
  assert.equal(core.detectWatchRegion('en', 'America/New_York'), 'US');

  // Continent level fallback
  assert.equal(core.detectWatchRegion('en', 'Asia/Tokyo'), 'JP'); // explicit
  assert.equal(core.detectWatchRegion('en', 'Asia/UnknownTz'), 'IN'); // Asia fallback
  assert.equal(core.detectWatchRegion('en', 'Europe/UnknownTz'), 'GB'); // Europe fallback
});

test('buildGoogleProviderSearchUrl: Encodes query properly', () => {
  const provider = { provider_name: 'Netflix' };
  const url = core.buildGoogleProviderSearchUrl('Inception', '2010', ' English', provider, 'watch online');
  assert.ok(url.includes('https://www.google.com/search?q='));
  assert.ok(url.includes(encodeURIComponent('Inception 2010 English Netflix watch online')));
});

test('parseAiJsonCotResponse: Strict JSON CoT parsing & validation', () => {
  // Case 1: Valid explicit confirmation & year match
  const validJson = JSON.stringify({
    year_match: "Yes",
    explicit_confirmation: "Yes",
    platform: "Netflix"
  });
  assert.equal(core.parseAiJsonCotResponse(validJson, ['Netflix', 'Prime Video']), 'Netflix');

  // Case 2: Rejected when year_match is No
  const invalidYearJson = JSON.stringify({
    year_match: "No",
    explicit_confirmation: "Yes",
    platform: "Netflix"
  });
  assert.equal(core.parseAiJsonCotResponse(invalidYearJson, ['Netflix']), null);

  // Case 3: Rejected when platform is "None"
  const nonePlatformJson = JSON.stringify({
    year_match: "Yes",
    explicit_confirmation: "Yes",
    platform: "None"
  });
  assert.equal(core.parseAiJsonCotResponse(nonePlatformJson, ['Netflix']), null);

  // Case 4: Markdown wrapped JSON
  const markdownWrapped = "```json\n" + validJson + "\n```";
  assert.equal(core.parseAiJsonCotResponse(markdownWrapped, ['Netflix']), 'Netflix');
});
