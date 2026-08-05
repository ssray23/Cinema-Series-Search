const apiKey = 'b90551ebe60ebd6e1c86724efd295ee0';

function getSpellingVariants(kw) {
  const ukToUs = {
    'humour': 'humor', 'colour': 'color', 'armour': 'armor',
    'behaviour': 'behavior', 'favour': 'favor', 'favourite': 'favorite',
    'flavour': 'flavor', 'harbour': 'harbor', 'honour': 'honor',
    'labour': 'labor', 'neighbour': 'neighbor', 'rumour': 'rumor',
    'saviour': 'savior', 'theatre': 'theater', 'centre': 'center',
    'defence': 'defense', 'offence': 'offense', 'jewellery': 'jewelry',
    'programme': 'program', 'dialogue': 'dialog'
  };
  const usToUk = Object.fromEntries(Object.entries(ukToUs).map(([k, v]) => [v, k]));
  
  let variant = kw.toLowerCase();
  let hasVariant = false;
  
  for (const [uk, us] of Object.entries(ukToUs)) {
    const regex = new RegExp(`\\b${uk}\\b`, 'g');
    if (regex.test(variant)) {
      variant = variant.replace(regex, us);
      hasVariant = true;
    }
  }
  
  if (!hasVariant) {
    for (const [us, uk] of Object.entries(usToUk)) {
      const regex = new RegExp(`\\b${us}\\b`, 'g');
      if (regex.test(variant)) {
        variant = variant.replace(regex, uk);
        hasVariant = true;
      }
    }
  }
  
  return hasVariant ? variant : null;
}

async function test(query) {
  let queries = [query];
  const variant = getSpellingVariants(query);
  if (variant) queries.push(variant);

  let combinedKeywords = [];
  for (const q of queries) {
    const res = await fetch(`https://api.themoviedb.org/3/search/keyword?query=${q}&api_key=${apiKey}`);
    const data = await res.json();
    if (data.results) {
      combinedKeywords = combinedKeywords.concat(data.results.slice(0, 5));
    }
  }
  
  // Deduplicate by ID
  const uniqueKeywords = Array.from(new Map(combinedKeywords.map(item => [item.id, item])).values());
  const activeKeywordId = uniqueKeywords.map(k => k.id).join('|');

  const res2 = await fetch(`https://api.themoviedb.org/3/discover/movie?with_keywords=${activeKeywordId}&with_genres=80&with_runtime.gte=40&api_key=${apiKey}`);
  const data2 = await res2.json();
  console.log(`Query "${query}": IDs ${activeKeywordId} -> results: ${data2.total_results}`);
}

async function run() {
  await test('humor');
  await test('humour');
}
run();
