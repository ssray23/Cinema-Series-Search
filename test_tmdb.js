const apiKey = 'b90551ebe60ebd6e1c86724efd295ee0';
async function test() {
  const res = await fetch(`https://api.themoviedb.org/3/search/keyword?query=journalist&api_key=${apiKey}`);
  const data = await res.json();
  const kids = data.results.slice(0, 5).map(k => k.id).join('|');
  const res2 = await fetch(`https://api.themoviedb.org/3/discover/movie?with_keywords=${kids}&with_runtime.gte=40&api_key=${apiKey}`);
  const data2 = await res2.json();
  console.log(`Discover movies with OR keywords (${kids}) and runtime >= 40: ${data2.total_results}`);
}
test();
