const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CSS = fs.readFileSync(path.join(__dirname, '../../styles.css'), 'utf8');

// Extract the .provider-pill rule block (base rule only)
function getPillBlock() {
  const match = CSS.match(/\.provider-pill\s*\{([^}]+)\}/s);
  assert.ok(match, '.provider-pill rule must exist in styles.css');
  return match[1];
}

// Extract the .btn-google-search rule block
function getGoogleBtnBlock() {
  const match = CSS.match(/\.btn-google-search\s*\{([^}]+)\}/s);
  assert.ok(match, '.btn-google-search rule must exist in styles.css');
  return match[1];
}

test('STYLE: provider-pill and btn-google-search share the same padding', () => {
  const pill = getPillBlock();
  const google = getGoogleBtnBlock();

  // Both must declare 0.45rem vertical padding
  assert.ok(pill.includes('0.45rem'), 'provider-pill must use 0.45rem vertical padding');
  assert.ok(google.includes('0.45rem'), 'btn-google-search must use 0.45rem vertical padding');

  // Both must declare 0.9rem horizontal padding
  assert.ok(pill.includes('0.9rem'), 'provider-pill must use 0.9rem horizontal padding');
  assert.ok(google.includes('0.9rem'), 'btn-google-search must use 0.9rem horizontal padding');
});

test('STYLE: provider-pill and btn-google-search share the same font-size', () => {
  const pill = getPillBlock();
  const google = getGoogleBtnBlock();
  assert.ok(pill.includes('font-size: 0.8rem'), 'provider-pill must use font-size 0.8rem');
  assert.ok(google.includes('font-size: 0.8rem'), 'btn-google-search must use font-size 0.8rem');
});

test('STYLE: provider-pill font-weight is medium (500) and not bold', () => {
  const pill = getPillBlock();
  assert.ok(pill.includes('font-weight: 500'), 'provider-pill must use font-weight 500');
});

test('STYLE: provider-pill and btn-google-search share the same gap', () => {
  const pill = getPillBlock();
  const google = getGoogleBtnBlock();
  assert.ok(pill.includes('gap: 0.5rem'), 'provider-pill gap must be 0.5rem');
  assert.ok(google.includes('gap: 0.5rem'), 'btn-google-search gap must be 0.5rem');
});

test('STYLE: provider-pill and btn-google-search share the same border-radius', () => {
  const pill = getPillBlock();
  const google = getGoogleBtnBlock();
  assert.ok(pill.includes('border-radius: 8px'), 'provider-pill must use border-radius 8px');
  assert.ok(google.includes('border-radius: 8px'), 'btn-google-search must use border-radius 8px');
});

test('STYLE: provider-pill img icon is 13px to match btn-google-search icon size', () => {
  const imgBlock = CSS.match(/\.provider-pill\s+img\s*\{([^}]+)\}/s);
  assert.ok(imgBlock, '.provider-pill img rule must exist');
  const block = imgBlock[1];
  assert.ok(block.includes('width: 13px'), 'provider-pill img width must be 13px');
  assert.ok(block.includes('height: 13px'), 'provider-pill img height must be 13px');
});
