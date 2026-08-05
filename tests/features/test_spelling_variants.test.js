const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../app.core.js');

test('FEATURE: Spelling Variants', () => {
  // Test UK to US
  assert.strictEqual(core.getSpellingVariants('humour'), 'humor');
  assert.strictEqual(core.getSpellingVariants('colour'), 'color');
  assert.strictEqual(core.getSpellingVariants('theatre'), 'theater');
  
  // Test US to UK
  assert.strictEqual(core.getSpellingVariants('humor'), 'humour');
  assert.strictEqual(core.getSpellingVariants('color'), 'colour');
  
  // Test no variant
  assert.strictEqual(core.getSpellingVariants('funny'), null);
});
