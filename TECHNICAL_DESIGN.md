# CineSearch — Technical Design Document

## Architecture Overview

CineSearch is a **client-side SPA (Single Page Application)** that directly queries [The Movie Database (TMDb) API](https://www.themoviedb.org/settings/api) from the browser. No backend server is involved in business logic — the lightweight Python server (`server.py`) exists only to serve static files on `localhost:8080`.

```
┌─────────────────────┐
│  Browser (User)     │
│  ┌───────────────┐  │
│  │  UI/Events    │  │
│  │  (index.html) │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │
           ├─────────────────────────────────────────┐
           │                                         │
           ▼                                         ▼
      ┌─────────────┐                      ┌────────────────┐
      │  app.js     │                      │  styles.css    │
      │  (Logic)    │                      │  (Styling)     │
      └──────┬──────┘                      └────────────────┘
             │
             │ (fetch JSON)
             ▼
      ┌─────────────────────────────┐
      │  TMDb API                   │
      │  (search, discover, details)│
      └─────────────────────────────┘
```

---

## Core Data Flow

### 1. Initialization
1. **App loads** → `DOMContentLoaded` fires, initializing all event listeners and UI state
2. **API key check** → localStorage is queried for `tmdb_api_key`; if missing, an overlay prompts the user
3. **Pre-discover** → If API key exists and this is a fresh load, the app calls `discoverMovies()` with default filters (cinema mode, any language, ranking sort)

### 2. User Interaction → Filter Change → API Call
1. User types in **Title**, selects **Year**, **Language**, **Genre**, **Actor**, **Actress**, or toggles **OTT**
2. Event listener fires (debounced for text input, immediate for dropdowns/checkboxes)
3. `discoverMovies()` is invoked with updated `currentPage = 1` (reset pagination)
4. Results are fetched, filtered, sorted, and rendered

### 3. Pagination
1. User clicks **Load More** button
2. `currentPage++` increments
3. `discoverMovies()` is called again; results are **appended** to `activeSearchResults`
4. UI updates to show cumulative tile count

---

## Search Pipelines

### Pipeline A: Title/Keyword Search (search endpoint)
**Triggered when:** User types a title/keyword AND no actor/actress is selected

**Flow:**
```javascript
endpoint = 'search/movie' or 'search/tv'
params = { query, page, language: 'en-US', include_adult: false }
```

**Pros:**
- Fast, no extra API calls for multi-page results
- Full-text fuzzy matching

**Cons:**
- `/search/movie` endpoint does NOT support `with_genres`, `with_original_language`, or `with_cast`
- Genre/language/year must be applied **client-side** after fetch

**Client-side post-filters (if active):**
- Genre: `movie.genre_ids.includes(selectedGenreId)`
- Language: `movie.original_language === selectedLanguage`
- Year: `releaseYear === selectedYear`

### Pipeline B: Discover Mode (discover endpoint)
**Triggered when:** Actor or actress is selected (requires cast parameter)

**Flow:**
```javascript
endpoint = 'discover/movie' or 'discover/tv'
params = {
  with_cast: castId1,castId2,  // comma = AND query (both cast members must appear)
  with_genres: genreId1|genreId2,  // pipe = OR query
  with_original_language: language,
  primary_release_year: year,
  sort_by: 'popularity.desc' or 'vote_average.desc' or 'primary_release_date.desc',
  page, include_adult: false
}
```

**Pros:**
- Server-side filtering is more efficient than client-side post-filtering
- Genre, language, year are natively supported parameters

**Cons:**
- Cannot combine title keyword + cast filters (TMDb discover has no `query` parameter)
- When user types a title WITH actor selected, the title search is silently dropped and we filter client-side (see comment at line 592)

---

## Smart Fetch Strategy

### The Problem
When OTT filtering is enabled, many results from TMDb have **no streaming provider data**, causing the client-side OTT filter to strip entire pages of results, leaving only a handful of tiles.

### The Solution: Adaptive Pool Selection

#### **Ranking Sort (vote_average.desc)**
- **Without adaptive logic:** TMDb's `vote_average.desc` sorts by rating alone, returning the pathological tail first: obscure titles with 1 vote and a 10.0 rating (festival shorts, unreleased films). Almost none have OTT data.
- **With adaptive logic:** We fetch by `popularity.desc` (a real, broad pool including low-vote recent OTT releases) and apply `weightedRating()` client-side to re-order by confidence-dampened ratings. Nothing is hidden; the low-vote titles are just ranked fairly.

```javascript
if (currentSort === 'vote_average.desc') {
  params.sort_by = 'popularity.desc';  // Fetch a real pool
}
// Then in sortActiveResults(), apply weightedRating() for client-side ordering
```

#### **Release Date Sort**
- **Without OTT filter:** Use true date sort (`primary_release_date.desc` or `first_air_date.desc`) to ensure genuine newest-first order, even for obscure titles
- **With OTT filter:** Use true date sort (same), but **increase the fetch loop budget** from 10 to 25 pages so that even if 80% of results lack OTT data, the loop digs deeper to accumulate enough streamable titles while preserving date order

```javascript
const maxAutoFetch = ottOnly ? 25 : 10;
while (newResults.length < 15 && autoFetchAttempts < maxAutoFetch) { ... }
```

#### **Popularity Sort**
- Pass through as-is; TMDb's popularity is already a robust, broad metric

### Auto-Pagination Loop
```javascript
let newResults = [];
let currentApiPage = currentPage;
while (newResults.length < 15 && autoFetchAttempts < maxAutoFetch) {
  let data = await fetchFromTMDb(endpoint, params);
  
  // Apply all client-side filters (fuzzy title match, language, genre, OTT check)
  pageResults = applyClientFilters(data.results);
  
  if (pageResults.length > 0) {
    newResults = newResults.concat(pageResults);
    if (newResults.length >= 15) break;  // Target: 15+ results per fetch
  }
  
  currentApiPage++;
  autoFetchAttempts++;
}
```

**Key insight:** The loop accumulates results *in sort order*. When OTT filtering strips results, the next page's newest or highest-popularity titles still come in their correct sequence.

---

## OTT Verification Pipeline

### Primary: TMDb Watch Providers API
When `ottOnly` is checked:

```javascript
for (const movie of pageResults) {
  const res = await fetchFromTMDb(`movie/${movie.id}`, {
    append_to_response: 'watch/providers'
  });
  const hasOtt = checkHasStreamProviders(res);
  if (hasOtt) keep(movie);
}
```

**Cost:** One extra API call per candidate title (the expensive filter)

**Data structure:**
```javascript
res['watch/providers'].results = {
  'IN': { flatrate: [{provider_id, provider_name}], rent: [...], buy: [...] },
  'US': { flatrate: [...], rent: [...], buy: [...] },
  ...
}
```

We check **flatrate** only (subscription; no rent/buy).

### Fallback: Production Company / Network Name Matching
**When:** TMDb's `/watch/providers` returns empty or missing data

**Logic:** Check the movie's `production_companies` and `networks` arrays for known OTT keywords:
```javascript
const knownOtts = ['netflix', 'amazon', 'prime video', 'hoichoi', 'zee5', 'hotstar', ...];
for (const company of movieData.production_companies) {
  if (matchesOttKeyword(company.name, knownOtts)) return true;
}
```

**Word-boundary matching:** `matchesOttKeyword('Maximilian Films Ltd.', 'max')` → **false** (substring inside a longer word). `matchesOttKeyword('HBO Max Films', 'max')` → **true** (word boundary respected).

---

## Ranking Without Exclusion

### weightedRating() Function
```javascript
function weightedRating(item) {
  const voteCount = item.vote_count || 0;
  const voteAverage = item.vote_average || 0;
  const minVotes = currentMode === 'tv' ? 5 : 50;
  
  if (voteCount >= minVotes) return voteAverage;  // High confidence: use raw rating
  return voteAverage * (voteCount / minVotes);     // Low confidence: dampen
}
```

**Example:**
- **Title A:** 5,000 votes, 8.0 average → `8.0` (above threshold)
- **Title B:** 2 votes, 9.0 average → `9.0 × (2/50) = 0.36` (dampened)
- **Ranking order:** A beats B (8.0 > 0.36)
- **Visibility:** B still appears in results; not hidden

**Philosophy:** Low-vote titles are re-ranked fairly, not excluded. A fresh OTT original with minimal votes can still surface if the user navigates through all results.

---

## Sort Modes & Client-Side Ordering

### Ranking (vote_average.desc)
```javascript
if (currentSort === 'vote_average.desc') {
  activeSearchResults.sort((a, b) => weightedRating(b) - weightedRating(a));
}
```

### Popularity (popularity.desc)
```javascript
else if (currentSort === 'popularity.desc') {
  activeSearchResults.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
}
```

### Release Date (primary_release_date.desc)
```javascript
else if (currentSort === 'primary_release_date.desc') {
  activeSearchResults.sort((a, b) => 
    new Date(b.release_date || b.first_air_date || 0) - 
    new Date(a.release_date || a.first_air_date || 0)
  );
}
```

### Title Match Relevance (tiebreaker)
When a title is typed, results are sorted by **fuzzy match score first**, then the selected sort mode as a tiebreaker:
```javascript
const titleQuery = titleInput.value.trim();
if (titleQuery) {
  activeSearchResults.sort((a, b) => {
    const scoreA = getTitleMatchScore(a.title, titleQuery);
    const scoreB = getTitleMatchScore(b.title, titleQuery);
    if (scoreA !== scoreB) return scoreB - scoreA;  // Highest match first
    return compareBySort(a, b);  // Tiebreaker: selected sort mode
  });
}
```

---

## State Management

### Global Variables
```javascript
let currentMode = 'movie';           // 'movie' or 'tv'
let currentSort = 'vote_average.desc';  // 'vote_average.desc', 'popularity.desc', 'primary_release_date.desc'
let currentPage = 1;                 // Current pagination page
let totalPages = 1;                  // Total pages from TMDb (for pagination UI)
let totalResults = 0;                // Total result count from TMDb
let activeSearchResults = [];         // Currently displayed tiles (after all filters + sort)
let selectedActorId = null;
let selectedActressId = null;
let tmdbApiKey = localStorage.getItem('tmdb_api_key') || 'default_key';
let currentTheme = localStorage.getItem('theme') || 'dark';
```

### Filter State
Filter UI values are read from DOM elements directly (no separate state object):
```javascript
const titleQuery = titleInput.value.trim();
const year = yearInput.value ? parseInt(yearInput.value, 10) : null;
const language = languageSelect.value || null;
const genre = genreSelect.value || null;
const ottOnly = ottOnlyCheckbox.checked;
```

---

## API Interactions

### fetchFromTMDb(endpoint, params)
Wrapper around `fetch()` that:
1. Appends `api_key` and `append_to_response` to params
2. Constructs URL: `https://api.themoviedb.org/3/{endpoint}?...`
3. Returns parsed JSON or throws on 401 (invalid key)

```javascript
async function fetchFromTMDb(endpoint, params) {
  if (!tmdbApiKey) throw new Error('API Key missing');
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  url.searchParams.append('api_key', tmdbApiKey);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.append(k, v);
  });
  const res = await fetch(url);
  if (res.status === 401) {
    localStorage.removeItem('tmdb_api_key');
    throw new Error('Invalid API Key');
  }
  return res.json();
}
```

### Example Calls

**Search for "Breaking Bad":**
```
GET /search/tv?api_key=...&query=Breaking%20Bad&page=1&language=en-US&include_adult=false
```

**Discover Bengali drama movies:**
```
GET /discover/movie?api_key=...&with_original_language=bn&with_genres=18&sort_by=popularity.desc&page=1
```

**Get watch providers for movie ID 550:**
```
GET /movie/550?api_key=...&append_to_response=watch%2Fproviders
```

---

## UI/UX Patterns

### Reactive Filtering
Every filter input has an event listener that triggers `discoverMovies()` (debounced for text input):

```javascript
titleInput.addEventListener('input', debounce(() => {
  currentPage = 1;
  discoverMovies();
}, 300));

genreSelect.addEventListener('change', () => {
  currentPage = 1;
  discoverMovies();
});
```

### Loader & Loading States
```javascript
function showLoader() {
  loader.classList.remove('hidden');
  resultsContainer.innerHTML = '';
  paginationContainer.classList.add('hidden');
}

function hideLoader() {
  loader.classList.add('hidden');
}
```

### Dynamic Genre Dropdown
Movie and TV modes have different genres. The `<select>` HTML is dynamically replaced:
```javascript
if (currentMode === 'movie') {
  genreSelect.innerHTML = MOVIE_GENRES;  // Predefined HTML string
} else {
  genreSelect.innerHTML = TV_GENRES;
}
```

### Dynamic Theme and Mode Adapting (CSS Custom Properties)
To create a premium visual experience, the page background and control buttons automatically update when switching between Cinema (Movie) and Series (TV) modes, and between Dark and Light themes:
- **Cinema Mode background**: Uses a soft red-hued gradient (`#3d1c1c` to `#17181c` in dark theme, `#ffc2c2` to `#fff0f0` in light theme).
- **Series Mode background**: Uses a soft teal-blue-hued gradient (`#132f35` to `#17181c` in dark theme, `#b2f0f4` to `#f0fbfc` in light theme).
- **Button Highlights**: Control buttons like the theme toggle (`#theme-toggle-btn`), configuration key (`#change-key-btn`), and shutdown controls (`.shutdown-control`) dynamically map to `var(--accent)` and `var(--accent-glow)`. This automatically flips their outlines and shadow colors between red and cyan/teal depending on the active search mode, preventing color mismatches.

### Detail Modal (Click Card)
```javascript
tile.addEventListener('click', () => {
  openDetailDialog(movie.id);
});

async function openDetailDialog(movieId) {
  const details = await fetchFromTMDb(`${currentMode}/${movieId}`, {
    append_to_response: 'watch/providers'
  });
  renderDetailModal(details);
  detailDialog.showModal();
}
```

### OTT Provider Pill Click
Each provider pill is a clickable link that opens a Google Search (via `site:` query) for reliable title-to-page matching:

```javascript
const PROVIDER_DOMAINS = {
  8: 'netflix.com',
  9: 'primevideo.com',
  232: 'zee5.com',
  ...
};

pill.addEventListener('click', (e) => {
  const domain = PROVIDER_DOMAINS[providerId];
  const url = `https://google.com/search?q=site:${domain} "${title}"`;
  window.open(url, '_blank');
});
```

---

## Performance Optimizations

### 1. Debounced Text Input
Title searches fire `discoverMovies()` after a 300ms pause (prevents spamming the API while user is typing):

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

### 2. Actor/Actress Autocomplete Caching
Actor search results are cached client-side to avoid re-fetching the same autocomplete query.

### 3. Lazy Detail Modal
Watch-provider and detail data is only fetched when the user clicks on a card (not on initial tile render).

### 4. Batch OTT Verification
When `ottOnly` is checked, the OTT filter is applied **after** other client-side filters (fuzzy title match, genre, language), reducing the number of expensive watch-provider API calls.

### 5. Image Lazy Loading
Tile backdrop images are fetched from TMDb's CDN; the `<img>` tags use native browser lazy loading where supported.

---

## Error Handling

### API Key Validation
On app load, if `localStorage.tmdb_api_key` is missing, an overlay prompts the user. If an API call returns 401, the stored key is deleted and the overlay re-appears.

### Network Errors
If `fetchFromTMDb()` throws:
```javascript
try {
  let data = await fetchFromTMDb(endpoint, params);
  // ...
} catch (err) {
  console.error('Error fetching from TMDb:', err);
  renderError('There was a problem querying TMDb. Please verify your API Key and check your connection.');
}
```

### Empty Results
If `discoverMovies()` returns 0 results after scanning pages 1–25:
```javascript
if (newResults.length === 0) {
  resultsContainer.innerHTML = `<div class="empty-state">No results found. Try adjusting your filters.</div>`;
}
```

### Future-Dated Releases
Unreleased titles are excluded from OTT verification (their provider data is often incomplete):
```javascript
const todayStr = new Date().toISOString().split('T')[0];
const releaseStr = movie.release_date || movie.first_air_date;
if (releaseStr && releaseStr > todayStr) {
  return { movie, hasStream: false };  // Treat as non-streamable
}
```

---

## Region Detection

### detectWatchRegion(language)
Maps user's browser timezone (or selected language) to ISO 3166-1 country code for accurate OTT provider availability:

```javascript
function detectWatchRegion(language) {
  const indianLanguages = ['hi', 'bn', 'ta', 'te', 'ml', 'mr', 'kn', 'gu', 'pa'];
  if (indianLanguages.includes(language)) return 'IN';
  
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzMap = { 'Asia/Kolkata': 'IN', 'Europe/London': 'GB', ... };
  return tzMap[tz] || 'US';  // Fallback to US
}
```

Used in the detail modal to collect watch-provider data for the user's region first, then fallback to India, then US.

---

## Future Enhancements

1. **Advanced Filters UI** — Add checkboxes for rating range, runtime, certification (PG, R, etc.)
2. **Saved Watchlist** — Store user's "Want to Watch" list in localStorage or a backend
3. **Recommendations** — "Similar to this title" based on genre/cast
4. **Streaming Availability Alerts** — Notify when a title becomes available on the user's preferred OTT platform
5. **Multi-language Support** — Localize UI strings (currently English only)
6. **Dark/Light Theme Toggle** — Already partially implemented; full theming system
7. **Share/Export** — Share search results or a watchlist via URL or JSON export
8. **Server-side Caching** — Migrate from stateless Python server to a Node.js backend with Redis cache for hot queries
9. **Analytics** — Track popular searches, filter combinations, and click-throughs (respecting privacy)
10. **Rate Limiting** — Implement client-side API key rate-limiting safeguard (warn user before hitting TMDb's 40 req/s limit)

---

## Testing Strategy (TODO)

- **Unit Tests:** `weightedRating()`, `matchesOttKeyword()`, `detectWatchRegion()` — Jest
- **Integration Tests:** Full `discoverMovies()` flow with mocked TMDb API — Cypress / Playwright
- **E2E Tests:** User journeys (search by title, filter by language, verify OTT pill, etc.) — Selenium / Playwright
- **Performance Tests:** Measure API call latency, UI render time, tile load time — Lighthouse / WebPageTest

---

## File Structure

```
Cinema Search/
├── index.html              # App structure, all UI components, modal templates
├── app.js                  # All business logic, API calls, event listeners
├── styles.css              # Full design system, dark/light themes, animations
├── server.py               # Lightweight Python HTTP server
├── README.md               # User-facing documentation
└── TECHNICAL_DESIGN.md     # This file
```

---

## References

- [TMDb API Documentation](https://developer.themoviedb.org/docs)
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [ISO 3166-1 Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1)

---

**Last Updated:** July 3, 2026  
**Version:** 1.0
