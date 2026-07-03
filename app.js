/**
 * CineSearch - Single Page Web Application Controller
 * Handles TMDb API integration, autocomplete suggestions, mock data fallback, dynamic rendering, and sorting.
 */

// --- Constants & Configuration ---
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';
const PROFILE_SIZE = 'w185';
const POSTER_SIZE = 'w342';
const BACKDROP_SIZE = 'w780';

/// --- State Management ---
let currentMode = 'movie';

const MOVIE_GENRES = `
  <option value="">Any Genre</option>
  <option value="28">Action</option>
  <option value="12">Adventure</option>
  <option value="16">Animation</option>
  <option value="35">Comedy</option>
  <option value="80">Crime</option>
  <option value="99">Documentary</option>
  <option value="18">Drama</option>
  <option value="10751">Family</option>
  <option value="14">Fantasy</option>
  <option value="36">History</option>
  <option value="27">Horror</option>
  <option value="10402">Music</option>
  <option value="9648">Mystery</option>
  <option value="10749">Romance</option>
  <option value="878">Sci-Fi</option>
  <option value="53,9648">Suspense</option>
  <option value="53">Thriller</option>
  <option value="10752">War</option>
  <option value="37">Western</option>
`;

const TV_GENRES = `
  <option value="">Any Genre</option>
  <option value="10759">Action & Adventure</option>
  <option value="16">Animation</option>
  <option value="35">Comedy</option>
  <option value="80">Crime</option>
  <option value="99">Documentary</option>
  <option value="18">Drama</option>
  <option value="10751">Family</option>
  <option value="10762">Kids</option>
  <option value="9648">Mystery</option>
  <option value="10763">News</option>
  <option value="10764">Reality</option>
  <option value="10765">Sci-Fi & Fantasy</option>
  <option value="10766">Soap</option>
  <option value="10767">Talk</option>
  <option value="10768">War & Politics</option>
  <option value="37">Western</option>
`;

let tmdbApiKey = localStorage.getItem('tmdb_api_key') || 'b90551ebe60ebd6e1c86724efd295ee0';
let selectedActorId = null;
let selectedActressId = null;
let currentSort = 'vote_average.desc';
let activeSearchResults = []; // Cache current search results for detail view
let currentPage = 1;
let totalPages = 1;
let totalResults = 0;
let isLoadingMore = false;
let firstNewCardIndex = -1; // Index where newly loaded cards start (-1 = fresh search)
let currentTheme = localStorage.getItem('theme') || 'dark';

// --- DOM Elements ---
const apiOverlay = document.getElementById('api-key-overlay');
const apiKeyForm = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key-input');
const changeKeyBtn = document.getElementById('change-key-btn');
const shutdownBtn = document.getElementById('shutdown-btn');
const shutdownOverlay = document.getElementById('shutdown-overlay');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');
const titleInput = document.getElementById('title-input');
const titleClearBtn = document.getElementById('title-clear-btn');
const ottOnlyCheckbox = document.getElementById('ott-only-checkbox');

const searchForm = document.getElementById('search-form');
const yearInput = document.getElementById('year-input');
const languageSelect = document.getElementById('language-select');
const genreSelect = document.getElementById('genre-select');
const clearBtn = document.getElementById('clear-btn');


// Actor autocomplete elements
const actorInput = document.getElementById('actor-input');
const actorClearBtn = document.getElementById('actor-clear-btn');
const actorInputWrapper = document.getElementById('actor-input-wrapper');
const actorSpinner = document.getElementById('actor-spinner');
const actorChip = document.getElementById('actor-chip');
const actorChipImg = document.getElementById('actor-chip-img');
const actorChipName = document.getElementById('actor-chip-name');
const removeActorBtn = document.getElementById('remove-actor-btn');
const actorSuggestions = document.getElementById('actor-suggestions');

// Actress autocomplete elements
const actressInput = document.getElementById('actress-input');
const actressClearBtn = document.getElementById('actress-clear-btn');
const actressInputWrapper = document.getElementById('actress-input-wrapper');
const actressSpinner = document.getElementById('actress-spinner');
const actressChip = document.getElementById('actress-chip');
const actressChipImg = document.getElementById('actress-chip-img');
const actressChipName = document.getElementById('actress-chip-name');
const removeActressBtn = document.getElementById('remove-actress-btn');
const actressSuggestions = document.getElementById('actress-suggestions');

// Results elements
const moviesGrid = document.getElementById('movies-grid');
const loader = document.getElementById('loader');
const emptyState = document.getElementById('empty-state');
const resultsCountText = document.getElementById('results-count-text');
const sortToolbar = document.getElementById('sort-toolbar');
const sortOpts = document.querySelectorAll('.sort-opt');
const paginationContainer = document.getElementById('pagination-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// Dialog elements
const detailDialog = document.getElementById('movie-detail-dialog');
const closeDialogBtn = document.getElementById('close-dialog-btn');
const dialogBackdrop = document.getElementById('dialog-backdrop');
const dialogPoster = document.getElementById('dialog-poster');
const dialogTitle = document.getElementById('dialog-title');
const dialogYear = document.getElementById('dialog-year');
const dialogLang = document.getElementById('dialog-lang');
const dialogSeasons = document.getElementById('dialog-seasons');
const dialogRatingVal = document.getElementById('dialog-rating-val');
const dialogOverview = document.getElementById('dialog-overview');
const dialogPopularity = document.getElementById('dialog-popularity');
const dialogVotes = document.getElementById('dialog-votes');
const googleSearchBtn = document.getElementById('google-search-btn');

// --- Helper: De-bounce function ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Toggle .has-value on each input wrapper to visually highlight filled fields.
 */
function updateHasValue() {
  const fields = [
    { el: titleInput },
    { el: yearInput },
    { el: languageSelect },
    { el: genreSelect },
  ];
  fields.forEach(({ el }) => {
    if (!el) return;
    const wrapper = el.closest('.input-with-icon');
    if (!wrapper) return;
    wrapper.classList.toggle('has-value', el.value.trim() !== '');
  });
}

function updateInlineClearButton(inputEl, clearBtnEl) {
  if (!inputEl || !clearBtnEl) return;
  clearBtnEl.classList.toggle('hidden', inputEl.value.trim() === '');
}

// --- API Methods ---

/**
 * Perform a generic fetch to TMDb API
 */
async function fetchFromTMDb(endpoint, queryParams = {}) {
  if (!tmdbApiKey) {
    showApiOverlay();
    throw new Error('API Key missing');
  }

  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  url.searchParams.append('api_key', tmdbApiKey);
  
  Object.keys(queryParams).forEach(key => {
    if (queryParams[key] !== undefined && queryParams[key] !== null) {
      url.searchParams.append(key, queryParams[key]);
    }
  });

  try {
    const response = await fetch(url.toString());
    if (response.status === 401) {
      localStorage.removeItem('tmdb_api_key');
      tmdbApiKey = '';
      showApiOverlay();
      throw new Error('Invalid API Key');
    }
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('TMDb Fetch Error:', error);
    throw error;
  }
}

/**
 * Search people for autocomplete suggestions
 * @param {string} query Search keyword
 * @param {number} genderFilter 1 for Female, 2 for Male
 */
async function searchPeople(query, genderFilter) {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const data = await fetchFromTMDb('search/person', {
      query: query.trim(),
      language: 'en-US',
      page: 1,
      include_adult: false
    });
    
    // TMDb gender codes: 0 = Unspecified, 1 = Female, 2 = Male
    // Filter suggestions based on requested gender input to provide high-quality matches
    return (data.results || []).filter(person => {
      const isActing = person.known_for_department === 'Acting';
      const genderMatches = (person.gender === genderFilter || person.gender === 0);
      return isActing && genderMatches;
    }).slice(0, 5);
  } catch (err) {
    return [];
  }
}

/**
 * Check if a movie result is likely a TV series, season, episode, or unscripted special.
 */
function isLikelyTvSeriesOrSpecial(movie) {
  const title = (movie.title || '').toLowerCase();
  const overview = (movie.overview || '').toLowerCase();
  
  // 1. Filter out TMDb TV Movie genre (10770)
  if (movie.genre_ids && movie.genre_ids.includes(10770)) {
    return true;
  }
  
  // 2. Filter out TV episode / season / series formats in the title
  const episodePattern = /\b(episode|season|tv series|tv show|television series|web series|miniseries|mini-series|talk show|game show|reality show)\b/i;
  if (episodePattern.test(title)) {
    return true;
  }
  
  // 2b. Filter out S01E01-style season/episode numbering in the title
  if (/\bS\d{1,2}\s*E\d{1,2}\b/i.test(title)) {
    return true;
  }
  
  // 3. Filter out items whose overview contains TV show / live show indicators
  const tvKeywords = [
    'television series',
    'tv series',
    'tv show',
    'web series',
    'miniseries',
    'anthology series',
    'talk show',
    'reality show',
    'game show',
    'daily soap',
    'soap opera',
    'based on the series',
    'based on the tv show',
    'improvised comedy special',
    'live comedy special',
    'unscripted live',
    'ucb theatre',
    'upright citizens brigade',
    'unscripted, live'
  ];
  
  if (tvKeywords.some(keyword => overview.includes(keyword))) {
    return true;
  }
  
  // 4. Specific titles or keywords in title
  if (title === 'house of lies live' || (title.includes('house of lies') && title.includes('live'))) {
    return true;
  }
  
  return false;
}

/**
 * Return language suffix for search queries to direct user to correct audio track (e.g. " Hindi").
 */
function getLanguageSuffix(movieOriginalLanguage) {
  const langNames = {
    'en': 'English',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'ml': 'Malayalam',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'es': 'Spanish',
    'fr': 'French',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'sv': 'Swedish',
    'pa': 'Punjabi',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'ur': 'Urdu'
  };
  
  // Try using active language filter if selected
  const activeLangCode = languageSelect ? languageSelect.value : '';
  const targetCode = activeLangCode || movieOriginalLanguage;
  
  const name = langNames[targetCode];
  return name ? ` ${name}` : '';
}

/**
 * Simple case-insensitive word-matching fuzzy algorithm
 */
function fuzzyMatch(title, query) {
  if (!query) return true;
  const target = (title || '').toLowerCase();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every(term => target.includes(term));
}

/**
 * Calculate title relevance match score for sorting priority:
 * 4: Exact match
 * 3: Starts-with prefix match
 * 2: Substring includes match
 * 1: General fuzzy matching terms present
 * 0: No match
 */
function getTitleMatchScore(title, query) {
  if (!query) return 0;
  const t = (title || '').trim().toLowerCase();
  const q = query.trim().toLowerCase();
  
  if (t === q) return 4;
  if (t.startsWith(q)) return 3;
  if (t.includes(q)) return 2;
  if (fuzzyMatch(title, query)) return 1;
  return 0;
}

/**
 * Check if a movie is available on flatrate subscription OTT platforms.
 */
function checkHasStreamProviders(movieData) {
  const watchData = movieData['watch/providers']?.results;
  if (watchData) {
    for (const loc of Object.keys(watchData)) {
      if (watchData[loc]?.flatrate?.length > 0) return true;
    }
  }
  
  // Fallback: Check Networks and Production Companies for known OTTs
  const knownOttKeywords = [
    'netflix', 'amazon', 'prime video', 'hoichoi', 'zee5', 'hotstar', 'disney+', 'hulu', 
    'apple tv', 'apple tv+', 'sony liv', 'jiocinema', 'peacock', 'paramount+', 'max', 'hbo',
    'chorki', 'bioscope', 'addatimes', 'klikk', 'bongo', 'bongobd', 'svf', 'eskay', 'surinder'
  ];
  
  const networks = movieData.networks || [];
  for (const n of networks) {
    if (n.name && knownOttKeywords.some(ott => n.name.toLowerCase().includes(ott))) return true;
  }
  
  const companies = movieData.production_companies || [];
  for (const c of companies) {
    if (c.name && knownOttKeywords.some(ott => c.name.toLowerCase().includes(ott))) return true;
  }

  return false;
}

/**
 * Detect the user's ISO 3166-1 country code from their browser timezone.
 * Used as watch_region for TMDb OTT filtering so results are regionally accurate.
 * Falls back to 'US' if the timezone is unrecognised.
 */
function detectWatchRegion(lang) {
  try {
    // If an Indian language is selected, force region to IN (India) for vastly superior OTT provider data coverage
    const indianLanguages = ['hi', 'bn', 'ta', 'te', 'ml', 'mr', 'kn', 'gu', 'pa'];
    if (lang && indianLanguages.includes(lang)) {
      return 'IN';
    }
    
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzMap = {
      'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN',
      'Asia/Dhaka': 'BD',
      'Asia/Karachi': 'PK',
      'Asia/Dubai': 'AE',
      'Asia/Singapore': 'SG',
      'Asia/Tokyo': 'JP',
      'Asia/Seoul': 'KR',
      'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
      'Asia/Bangkok': 'TH',
      'Asia/Jakarta': 'ID',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Rome': 'IT',
      'Europe/Madrid': 'ES',
      'Europe/Amsterdam': 'NL',
      'America/New_York': 'US', 'America/Chicago': 'US',
      'America/Denver': 'US', 'America/Los_Angeles': 'US',
      'America/Toronto': 'CA', 'America/Vancouver': 'CA',
      'America/Sao_Paulo': 'BR',
      'America/Mexico_City': 'MX',
      'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
    };
    if (tzMap[tz]) return tzMap[tz];
    // Continent-level fallback
    if (tz.startsWith('Asia/')) return 'IN';
    if (tz.startsWith('Europe/')) return 'GB';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('America/')) return 'US';
    return 'US';
  } catch (e) {
    return 'US';
  }
}

/**
 * Weighted rating for the "Ranking" sort: dampens vote_average for titles that
 * haven't crossed a minimum vote-count confidence threshold, instead of hiding
 * them outright. A brand-new or regional show with 2 votes and a 9.0 average no
 * longer either (a) gets server-side excluded, or (b) unfairly outranks a show
 * with 5,000 votes and an 8.0 average - it settles somewhere honest in between.
 */
function weightedRating(item) {
  const voteCount = item.vote_count || 0;
  const voteAverage = item.vote_average || 0;
  const minVotes = currentMode === 'tv' ? 5 : 50;
  if (voteCount >= minVotes) return voteAverage;
  return voteAverage * (voteCount / minVotes);
}

/**
 * Comparator for the currently active sort mode (Ranking / Popularity / Release Date).
 */
function compareBySort(a, b) {
  if (currentSort === 'vote_average.desc') {
    return weightedRating(b) - weightedRating(a);
  } else if (currentSort === 'popularity.desc') {
    return (b.popularity || 0) - (a.popularity || 0);
  } else if (currentSort === 'primary_release_date.desc') {
    return new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0);
  }
  return (b.popularity || 0) - (a.popularity || 0);
}

/**
 * Sort activeSearchResults in place: title-match relevance first (when a title
 * query is active), then the user's chosen sort mode as a tiebreaker/primary key.
 * FIX (Bug #3): this is called both after a fetch AND directly from the sort-button
 * click handler (no refetch) - see setupEventListeners - so switching sort modes
 * re-orders the exact same set of cards instead of pulling a new, differently-sized
 * pool from TMDb.
 */
function sortActiveResults() {
  const titleQuery = titleInput ? titleInput.value.trim() : '';
  if (titleQuery) {
    activeSearchResults.sort((a, b) => {
      const scoreA = Math.max(getTitleMatchScore(a.title || a.name, titleQuery), getTitleMatchScore(a.original_title || a.original_name, titleQuery));
      const scoreB = Math.max(getTitleMatchScore(b.title || b.name, titleQuery), getTitleMatchScore(b.original_title || b.original_name, titleQuery));
      if (scoreA !== scoreB) return scoreB - scoreA; // Highest match tier first
      return compareBySort(a, b);
    });
  } else {
    activeSearchResults.sort(compareBySort);
  }
}

/**
 * Discover movies using combinations of active filters (Live API & Fuzzy Search)
 */
async function discoverMovies() {
  if (currentPage === 1) {
    showLoader();
    paginationContainer.classList.add('hidden');
  } else {
    loadMoreBtn.disabled = true;
    loadMoreBtn.querySelector('span').textContent = 'Loading...';
  }
  

  
  const titleQuery = titleInput ? titleInput.value.trim() : '';
  const year = yearInput.value ? parseInt(yearInput.value, 10) : null;
  const language = languageSelect.value || null;
  const genre = genreSelect ? genreSelect.value || null : null;
  const ottOnly = ottOnlyCheckbox ? ottOnlyCheckbox.checked : false;
  
  // Combine cast members. Comma = AND query in TMDb discover
  let withCast = [];
  if (selectedActorId) withCast.push(selectedActorId);
  if (selectedActressId) withCast.push(selectedActressId);
  const castQuery = withCast.length > 0 ? withCast.join(',') : null;

  // Build query configuration
  let endpoint = `discover/${currentMode}`;
  const params = {
    include_adult: false,
    include_video: false,
    page: currentPage,
    language: 'en-US'
  };

  // If sorting is by popularity or release date, pass to TMDb discover.
  // Note: search/movie and search/tv endpoints don't support sort_by.
  if (currentSort) {
    if (currentMode === 'tv' && currentSort === 'primary_release_date.desc') {
      params.sort_by = 'first_air_date.desc';
    } else {
      params.sort_by = currentSort;
    }
  }

  // Add vote count minimum for ranking so obscure 1-vote titles don't show up first.
  // We scale this dynamically based on language volume so sparse catalogs (like Bengali) still show results,
  // while high-volume/global catalogs (like English/Any Language) cleanly filter out low-vote spam.
  if (currentSort === 'vote_average.desc') {
    let minVotes = 50; // Default fallback
    if (!language) {
      // Any Language (Global Catalog)
      minVotes = currentMode === 'tv' ? 100 : 200;
    } else if (language === 'en') {
      // English
      minVotes = currentMode === 'tv' ? 50 : 100;
    } else if (['es', 'fr', 'ja', 'ko', 'hi', 'zh', 'de', 'it', 'pt', 'ru'].includes(language)) {
      // Major languages
      minVotes = currentMode === 'tv' ? 25 : 50;
    } else {
      // Regional / Sparse languages (like Bengali, Marathi, etc.)
      minVotes = currentMode === 'tv' ? 5 : 10;
    }
    params['vote_count.gte'] = minVotes;
  }

  if (year) {
    if (currentMode === 'movie') {
      params.primary_release_year = year;
    } else {
      params.first_air_date_year = year;
    }
  }
  
  // Choose query strategy
  // Use search/movie only for pure title searches with no filters.
  // When language is set, use discover/movie for reliable server-side filtering
  // (search/movie doesn't support with_original_language).
  // FIX (Bug #1 / #2): previously this required year/genre/language to be EMPTY
  // before using the text-search endpoint. That forced any title+filter combo into
  // discover mode, which has NO free-text query parameter - the title was silently
  // dropped server-side and only reappeared via a client-side scan of ~100 items.
  // Year/genre/language are already handled as post-filters below (isSearchMode && year/genre/language),
  // so search mode can stay active whenever cast filters aren't in play.
  const isSearchMode = titleQuery && !selectedActorId && !selectedActressId;
  if (isSearchMode) {
    endpoint = `search/${currentMode}`;
    params.query = titleQuery;
  } else {
    if (language) params.with_original_language = language;
    if (castQuery) params.with_cast = castQuery;
    if (genre) params.with_genres = genre;
    // We intentionally DO NOT use server-side OTT filtering (with_watch_monetization_types) here.
    // TMDb's native server-side OTT filter completely hides titles with missing streaming data,
    // which breaks our Smart Network Fallback. We handle all OTT filtering client-side.
  }

    // FIX (Bug #2 / #3): this used to hard-exclude any title with vote_count below
    // 5 (TV) / 50 (movie) whenever Ranking sort was active - server-side, before the
    // client ever saw the result. Brand-new or region-specific titles (an Indian OTT
    // original two weeks old, say) legitimately have 0-4 votes and were invisible
    // by design. Low-confidence ratings are now dampened client-side instead of
    // excluded - see weightedRating() - so nothing gets hidden, only re-ranked.

  try {
    let newResults = [];
    let currentApiPage = currentPage;
    const isFirstLoad = (currentPage === 1);
    let fetchedTotalPages = 1;
    let autoFetchAttempts = 0;
    
    // Auto-fetch loop to ensure we get a decent number of results if client-side filters are strict
    while (newResults.length < 15 && autoFetchAttempts < 10) {
      params.page = currentApiPage;
      const data = await fetchFromTMDb(endpoint, params);
      
      fetchedTotalPages = data.total_pages || 1;
      totalResults = data.total_results || 0;
      
      let pageResults = data.results || [];
      
      // Exclude TV series, episodes, and specials to ensure only movies are listed
      if (currentMode === 'movie') {
        pageResults = pageResults.filter(movie => !isLikelyTvSeriesOrSpecial(movie));
      }
      
      
      // Apply client-side language filtering for search/movie
      if (isSearchMode && language) {
        pageResults = pageResults.filter(movie => movie.original_language === language);
      }
      
      // Apply client-side genre filtering for search/movie
      if (isSearchMode && genre) {
        const genreIds = genre.split('|');
        pageResults = pageResults.filter(movie =>
          movie.genre_ids && movie.genre_ids.some(id => genreIds.includes(String(id)))
        );
      }
      
      // Apply client-side fuzzy title filtering for discover/movie
      if (!isSearchMode && titleQuery) {
        pageResults = pageResults.filter(movie => 
          fuzzyMatch(movie.title || movie.name, titleQuery) || fuzzyMatch(movie.original_title || movie.original_name, titleQuery)
        );
      }

      // Per-movie OTT verification (runs globally for both search and discover)
      // This allows our Smart Network Fallback to catch missing TMDb data.
      if (ottOnly && pageResults.length > 0) {
        try {
          const providerPromises = pageResults.map(async (movie) => {
            try {
              // Exclude future-dated unreleased titles from OTT verification
              const todayStr = new Date().toISOString().split('T')[0];
              const releaseStr = movie.release_date || movie.first_air_date;
              if (releaseStr && releaseStr > todayStr) {
                return { movie, hasStream: false };
              }

              const res = await fetchFromTMDb(`${currentMode}/${movie.id}`, { append_to_response: 'watch/providers' });
              return { movie, hasStream: checkHasStreamProviders(res) };
            } catch (err) {
              return { movie, hasStream: false };
            }
          });
          const streamStatus = await Promise.all(providerPromises);
          pageResults = streamStatus.filter(s => s.hasStream).map(s => s.movie);
        } catch (err) {
          console.error("Error filtering OTT movies client-side:", err);
        }
      }
      
      if (pageResults.length > 0) {
        newResults = newResults.concat(pageResults);
        if (newResults.length >= 15) {
          break;
        }
      }
      
      if (currentApiPage >= fetchedTotalPages) {
        break;
      }
      
      currentApiPage++;
      autoFetchAttempts++;
    }
    
    // Update the app's understanding of pagination
    currentPage = currentApiPage;
    totalPages = fetchedTotalPages;


    if (isFirstLoad) {
      activeSearchResults = newResults;
    } else {
      activeSearchResults.push(...newResults);
    }

    // Sort results (priority: relevance score of title match, then selected sort criteria)
    sortActiveResults();

    renderMovies(activeSearchResults);

    // Update dynamic results counter label - always show actual displayed count
    const displayedCount = activeSearchResults.length;
    let suffix = currentMode === 'movie' ? `movie${displayedCount !== 1 ? 's' : ''}` : 'series';
    if (currentPage < totalPages) {
      resultsCountText.innerHTML = `Found <span>${displayedCount}</span>+ ${suffix}`;
    } else {
      resultsCountText.innerHTML = `Found <span>${displayedCount}</span> ${suffix}`;
    }

    // Manage load-more visibility
    if (activeSearchResults.length > 0 && currentPage < totalPages) {
      paginationContainer.classList.remove('hidden');
    } else {
      paginationContainer.classList.add('hidden');
    }
  } catch (error) {
    console.error('Discover Movies Error:', error);
    if (currentPage === 1) {
      hideLoader();
      moviesGrid.innerHTML = `
        <div class="empty-state glass-card">
          <div class="empty-icon" style="color: var(--red);">
            <i data-lucide="alert-triangle"></i>
          </div>
          <h3>Search Failed</h3>
          <p>There was a problem querying TMDb. Please verify your API Key and check your connection.</p>
        </div>
      `;
      lucide.createIcons();
    }
  } finally {

    loadMoreBtn.disabled = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.querySelector('span').textContent = currentMode === 'movie' ? 'Load More Movies' : 'Load More Series';
  }
}

// --- UI Logic & Autocomplete Render ---

function showApiOverlay() {
  apiOverlay.classList.remove('hidden');
  apiKeyInput.value = tmdbApiKey;
}

function hideApiOverlay() {
  apiOverlay.classList.add('hidden');
}

function showLoader() {
  emptyState.classList.add('hidden');
  moviesGrid.classList.add('hidden');
  loader.classList.remove('hidden');
  resultsCountText.textContent = 'Searching...';
}

function hideLoader() {
  loader.classList.add('hidden');
  moviesGrid.classList.remove('hidden');
}

/**
 * Handle person selection in suggestions list
 */
function selectPerson(person, type) {
  const avatarUrl = person.profile_path
    ? `${TMDB_IMAGE_BASE}${PROFILE_SIZE}${person.profile_path}`
    : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80'; // fallback

  if (type === 'actor') {
    selectedActorId = person.id;
    actorInputWrapper.classList.add('hidden');
    actorSuggestions.classList.add('hidden');
    actorSuggestions.innerHTML = '';
    
    actorChipName.textContent = person.name;
    actorChipImg.src = avatarUrl;
    actorChipImg.alt = person.name;
    actorChip.classList.remove('hidden');
  } else {
    selectedActressId = person.id;
    actressInputWrapper.classList.add('hidden');
    actressSuggestions.classList.add('hidden');
    actressSuggestions.innerHTML = '';
    
    actressChipName.textContent = person.name;
    actressChipImg.src = avatarUrl;
    actressChipImg.alt = person.name;
    actressChip.classList.remove('hidden');
  }
  
  // Re-run discovery automatically upon selecting a person to improve responsiveness
  currentPage = 1;
  discoverMovies();
}

/**
 * Render suggestions in the dropdown
 */
function renderSuggestions(suggestions, listContainer, type) {
  listContainer.innerHTML = '';
  
  if (suggestions.length === 0) {
    listContainer.classList.add('hidden');
    return;
  }
  
  suggestions.forEach(person => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    
    const imgUrl = person.profile_path
      ? `${TMDB_IMAGE_BASE}w45${person.profile_path}`
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&h=50&q=80';
      
    item.innerHTML = `
      <img src="${imgUrl}" alt="${person.name}" class="suggestion-avatar">
      <span class="suggestion-name">${person.name}</span>
      <span class="suggestion-sub">Acting</span>
    `;
    
    item.addEventListener('click', () => selectPerson(person, type));
    listContainer.appendChild(item);
  });
  
  listContainer.classList.remove('hidden');
}

/**
 * Render movie results into the grid
 */
function renderMovies(movies) {
  hideLoader();
  moviesGrid.innerHTML = '';
  
  if (movies.length === 0) {
    resultsCountText.textContent = 'No matches found';
    sortToolbar.classList.add('hidden');
    moviesGrid.innerHTML = `
      <div class="empty-state glass-card">
        <div class="empty-icon">
          <i data-lucide="frown"></i>
        </div>
        <h3>No ${currentMode === 'movie' ? 'Movies' : 'Series'} Found</h3>
        <p>We couldn't find any titles matching those specific criteria. Try adjusting the year or search fields.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  sortToolbar.classList.remove('hidden');

  let firstNewCard = null;

  movies.forEach((movie, index) => {
    const card = document.createElement('div');
    card.className = 'movie-card glass-card';
    card.dataset.id = movie.id;
    
    // Mark cards that are newly loaded (load-more) for entrance animation
    const isNew = firstNewCardIndex >= 0 && index >= firstNewCardIndex;
    if (isNew) {
      card.classList.add('card-entering');
      // Stagger delay: each new card slightly later, capped at 400ms
      const delay = Math.min((index - firstNewCardIndex) * 50, 400);
      card.style.animationDelay = `${delay}ms`;
      if (!firstNewCard) firstNewCard = card;
    }
    
    const posterUrl = movie.poster_path
      ? `${TMDB_IMAGE_BASE}${POSTER_SIZE}${movie.poster_path}`
      : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=400&h=600&q=80';
      
    let displayDate = 'N/A';
    const mDate = movie.release_date || movie.first_air_date;
    if (mDate) {
      const dateParts = mDate.split('-');
      if (dateParts.length >= 2) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(dateParts[1], 10) - 1;
        const month = months[monthIndex] || '';
        displayDate = `${month} ${dateParts[0]}`;
      } else {
        displayDate = mDate;
      }
    }
      
    const ratingVal = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';
    
    card.innerHTML = `
      <div class="movie-poster-box">
        <img src="${posterUrl}" alt="${movie.title || movie.name}" loading="lazy">
        <div class="movie-rating">
          <i data-lucide="star" class="fill-gold"></i>
          <span>${ratingVal}</span>
        </div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${movie.title || movie.name}</h3>
        <div class="movie-meta-row">
          <span>${displayDate}</span>
          <span style="text-transform: uppercase;">${movie.original_language}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => openMovieDetails(movie.id));
    moviesGrid.appendChild(card);
  });

  // Scroll smoothly to the first new card after a brief paint delay
  if (firstNewCard) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });
  }

  // Reset for next fresh search
  firstNewCardIndex = -1;
  
  adjustPartiallyFilledRows();
  lucide.createIcons();
}

/**
 * Hide partially filled grid rows at the end of the list when more pages are available to load.
 */
function adjustPartiallyFilledRows() {
  const cards = moviesGrid.querySelectorAll('.movie-card');
  if (cards.length === 0) return;

  const hasMorePages = currentPage < totalPages;
  if (!hasMorePages) {
    // Show all cards
    cards.forEach(card => card.classList.remove('hidden-row-card'));
    return;
  }

  // Calculate current grid columns count
  const gridStyle = window.getComputedStyle(moviesGrid);
  const templateCols = gridStyle.getPropertyValue('grid-template-columns');
  if (!templateCols) return;

  const columnsCount = templateCols.trim().split(/\s+/).length;
  if (columnsCount <= 0) return;

  const totalVisibleCount = Math.floor(cards.length / columnsCount) * columnsCount;
  // If we don't even have one full row yet, keep cards visible instead of rendering a blank grid.
  if (totalVisibleCount === 0) {
    cards.forEach(card => card.classList.remove('hidden-row-card'));
    return;
  }

  cards.forEach((card, index) => {
    if (index >= totalVisibleCount) {
      card.classList.add('hidden-row-card');
    } else {
      card.classList.remove('hidden-row-card');
    }
  });
}

/**
 * Open movie details dialog
 */
async function openMovieDetails(movieId) {
  const movie = activeSearchResults.find(m => m.id === movieId);
  if (!movie) return;

  const backdropUrl = movie.backdrop_path
    ? `${TMDB_IMAGE_BASE}${BACKDROP_SIZE}${movie.backdrop_path}`
    : '';
    
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${POSTER_SIZE}${movie.poster_path}`
    : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=400&h=600&q=80';

  // Populate basic data immediately
  const dialogContentEl = document.querySelector('.dialog-content');
  if (backdropUrl) {
    dialogBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
    dialogBackdrop.style.display = 'block';
    dialogContentEl?.classList.remove('no-backdrop');
  } else {
    dialogBackdrop.style.display = 'none';
    dialogContentEl?.classList.add('no-backdrop');
  }
  
  dialogPoster.src = posterUrl;
  // BONUS FIX: TV results use .name, not .title - this was blanking the dialog
  // heading and poster alt-text for every series (title.textContent was undefined).
  dialogPoster.alt = movie.title || movie.name;
  dialogTitle.textContent = movie.title || movie.name;
  const movieDateStr = movie.release_date || movie.first_air_date;
  const movieYear = movieDateStr ? movieDateStr.substring(0, 4) : '';
  dialogYear.textContent = movieYear || 'N/A';
  dialogLang.textContent = (movie.original_language || 'en').toUpperCase();
  
  // Reset and hide new elements initially to avoid showing stale data from previous modal opens
  const runtimeTag = document.getElementById('dialog-runtime');
  const typeTag = document.getElementById('dialog-type');
  const genresContainer = document.getElementById('dialog-genres-container');
  
  if (runtimeTag) {
    runtimeTag.textContent = '';
    runtimeTag.classList.add('hidden');
  }
  if (typeTag) {
    typeTag.textContent = '';
    typeTag.classList.add('hidden');
  }
  if (genresContainer) {
    genresContainer.textContent = '';
  }

  if (googleSearchBtn) {
    const langSuffix = getLanguageSuffix(movie.original_language);
    const mediaType = currentMode === 'movie' ? 'movie' : 'tv show';
    const query = encodeURIComponent(`${movie.title || movie.name} ${movieYear}${langSuffix} ${mediaType}`);
    googleSearchBtn.href = `https://www.google.com/search?q=${query}`;
  }
  dialogRatingVal.textContent = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  dialogOverview.textContent = movie.overview || 'No overview available.';
  dialogPopularity.textContent = movie.popularity ? movie.popularity.toFixed(1) : 'N/A';
  dialogVotes.textContent = movie.vote_count ? movie.vote_count.toLocaleString() : '0';

  // Initialize watch providers loader
  const providersContainer = document.getElementById('dialog-providers-container');
  if (providersContainer) {
    providersContainer.innerHTML = '<span class="text-muted">Loading platforms...</span>';
  }

  // Open native dialog
  detailDialog.showModal();
  lucide.createIcons();

  // Asynchronously fetch watch providers (with details)
  try {
    const details = await fetchFromTMDb(`${currentMode}/${movieId}`, { append_to_response: 'watch/providers' });
    
    // Update additional fields from detailed fetch
    if (details.runtime) {
      if (runtimeTag) {
        const hrs = Math.floor(details.runtime / 60);
        const mins = details.runtime % 60;
        runtimeTag.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
        runtimeTag.classList.remove('hidden');
      }
    }
    
    if (typeTag) {
      if (currentMode === 'movie') {
        const isTvMovie = details.genres && details.genres.some(g => g.id === 10770);
        typeTag.textContent = isTvMovie ? 'TV Movie' : 'Feature Film';
      } else {
        typeTag.textContent = 'TV Series';
      }
      typeTag.classList.remove('hidden');
    }
    
    if (dialogSeasons) {
      if (currentMode === 'tv' && details.number_of_seasons) {
        const seasons = details.number_of_seasons;
        const eps = details.number_of_episodes;
        dialogSeasons.textContent = `${seasons} Season${seasons !== 1 ? 's' : ''}` + (eps ? ` (${eps} eps)` : '');
        dialogSeasons.classList.remove('hidden');
      } else {
        dialogSeasons.classList.add('hidden');
      }
    }
    
    if (genresContainer && details.genres && details.genres.length > 0) {
      genresContainer.innerHTML = details.genres
        .map(g => `<span class="genre-pill">${g.name}</span>`)
        .join('');
    }

    renderWatchProviders(details);
  } catch (err) {
    console.error('Failed to fetch watch providers:', err);
    if (providersContainer) {
      providersContainer.innerHTML = '<span class="text-muted">Streaming platforms unavailable.</span>';
    }
  }
}

/**
 * Render watch providers (OTT streaming services) inside the dialog
 */
function renderWatchProviders(details) {
  const container = document.getElementById('dialog-providers-container');
  const rentContainer = document.getElementById('dialog-rent-container');
  const rentSection = document.getElementById('dialog-rent-section');
  if (!container) return;

  container.innerHTML = '';
  if (rentContainer) rentContainer.innerHTML = '';
  if (rentSection) rentSection.style.display = 'none';

  let detectedCountry = 'IN';
  try {
    detectedCountry = (navigator.language || 'en-IN').split('-')[1]?.toUpperCase() || 'IN';
  } catch (e) {
    console.error('Error detecting country:', e);
  }

  const providersData = details['watch/providers'] || details.watch_providers;
  const results = providersData?.results;

  const flatrateList = [];
  const rentList = [];
  const seenFlatrate = new Set();
  const seenRent = new Set();

  const collectForCountry = (code) => {
    if (!results) return;
    const countryResults = results[code];
    if (!countryResults) return;

    // Flatrate (subscription)
    if (countryResults.flatrate) {
      countryResults.flatrate.forEach(p => {
        const key = `${p.provider_id}-${p.provider_name}`;
        if (!seenFlatrate.has(key)) {
          seenFlatrate.add(key);
          flatrateList.push({ ...p, country: code });
        }
      });
    }

    // Rent and Buy (transactional - e.g. YouTube Movies, Google Play, iTunes)
    ['rent', 'buy'].forEach(type => {
      if (countryResults[type]) {
        countryResults[type].forEach(p => {
          const key = `${p.provider_id}-${p.provider_name}`;
          if (!seenRent.has(key)) {
            seenRent.add(key);
            rentList.push({ ...p, country: code });
          }
        });
      }
    });
  };

  if (results) {
    // Priority: user country → India → US fallback
    collectForCountry(detectedCountry);
    if (detectedCountry !== 'IN') collectForCountry('IN');
    if (flatrateList.length === 0 && rentList.length === 0 && detectedCountry !== 'US') {
      collectForCountry('US');
    }
    // Last resort: any country
    if (flatrateList.length === 0 && rentList.length === 0) {
      for (const code of Object.keys(results)) {
        collectForCountry(code);
        if (flatrateList.length > 0 || rentList.length > 0) break;
      }
    }
  }

    const todayStr = new Date().toISOString().split('T')[0];
    const releaseStr = details.release_date || details.first_air_date;
    const isFutureRelease = releaseStr && releaseStr > todayStr;

    if (flatrateList.length === 0 && !isFutureRelease) {
      // Smart Fallback: If JustWatch dropped the ball, check networks/production companies for known OTTs
      const knownOtts = [
        { id: 8, name: 'Netflix' },
        { id: 9, name: 'Amazon Prime Video', alias: 'Amazon' },
        { id: 315, name: 'Hoichoi', alias: 'SVF' },
        { id: 315, name: 'Hoichoi', alias: 'Eskay' },
        { id: 315, name: 'Hoichoi', alias: 'Surinder' },
        { id: 122, name: 'Disney+ Hotstar', alias: 'Hotstar' },
        { id: 232, name: 'Zee5' },
        { id: 237, name: 'Sony LIV' },
        { id: 392, name: 'JioCinema' },
        { id: 337, name: 'Disney+' },
        { id: 15, name: 'Hulu' },
        { id: 350, name: 'Apple TV+' },
        { id: 384, name: 'Max', alias: 'HBO' },
        { id: 386, name: 'Peacock' },
        { id: 531, name: 'Paramount+' },
        { id: 10001, name: 'Chorki' },
        { id: 10002, name: 'Bioscope' },
        { id: 10003, name: 'Klikk' },
        { id: 10004, name: 'Addatimes' },
        { id: 10005, name: 'Bongo' }
      ];

      const allEntities = [...(details.networks || []), ...(details.production_companies || [])];
      
      for (const entity of allEntities) {
        if (!entity.name) continue;
        const entityNameLower = entity.name.toLowerCase();
        
        for (const ott of knownOtts) {
          const matchesName = entityNameLower.includes(ott.name.toLowerCase());
          const matchesAlias = ott.alias && entityNameLower.includes(ott.alias.toLowerCase());
          
          if (matchesName || matchesAlias) {
            flatrateList.push({
              provider_id: ott.id,
              provider_name: entity.name, // Display the exact network name (e.g. "Hoichoi (IN)")
              logo_path: entity.logo_path || null,
              country: 'Global'
            });
            seenFlatrate.add(`${ott.id}-${entity.name}`);
            break;
          }
        }
      }
    }

    if (flatrateList.length === 0) {
      if (isFutureRelease) {
        container.innerHTML = '<span class="text-muted">Not streaming on flatrate OTT platforms (unreleased).</span>';
      } else {
        container.innerHTML = '<span class="text-muted">Not streaming on flatrate OTT platforms.</span>';
      }
    }

  // Map of TMDb provider_id → domain for Google site: queries.
  // All OTT pills intentionally use Google for more reliable title-to-page matching.
  const PROVIDER_DOMAINS = {
    8: 'netflix.com',             // Netflix
    175: 'netflix.com',           // Netflix Kids
    9: 'primevideo.com',          // Amazon Prime Video (GB)
    119: 'primevideo.com',        // Amazon Prime Video (IN)
    10: 'primevideo.com',         // Amazon Video
    2100: 'primevideo.com',       // Amazon Prime with Ads
    337: 'disneyplus.com',        // Disney+
    122: 'hotstar.com',           // Disney+ Hotstar
    2336: 'hotstar.com',          // JioHotstar
    232: 'zee5.com',              // Zee5
    237: 'sonyliv.com',           // Sony LIV
    315: 'hoichoi.tv',            // Hoichoi
    2176: 'hoichoi.tv',           // Hoichoi Amazon Channel
    392: 'jiocinema.com',         // JioCinema
    188: 'youtube.com',           // YouTube Premium
    192: 'youtube.com',           // YouTube
    235: 'youtube.com',           // YouTube Free
    41: 'itv.com',                // ITVX
    2300: 'itv.com',              // ITVX Premium
    38: 'bbc.co.uk',              // BBC iPlayer
    39: 'bbc.co.uk',              // BBC iPlayer (alt)
    103: 'channel4.com',          // Channel 4
    2311: 'channel4.com',         // Channel 4 Plus
    350: 'tv.apple.com',          // Apple TV+
    15: 'hulu.com',               // Hulu
    384: 'max.com',               // Max
    1899: 'max.com',              // Max (alt id)
    386: 'peacocktv.com',         // Peacock
    531: 'paramountplus.com',     // Paramount+
    11: 'mubi.com',               // MUBI
    283: 'crunchyroll.com',       // Crunchyroll
    258: 'skyshowtime.com',       // SkyShowtime
    569: 'curiositystream.com',   // CuriosityStream
    37: 'shudder.com',            // Shudder
    3: 'play.google.com',         // Google Play Movies
    2: 'tv.apple.com',            // Apple iTunes
    68: 'microsoft.com',          // Microsoft Movies
    10001: 'chorki.com',
    10002: 'bioscope-live.com',
    10003: 'klikk.tv',
    10004: 'addatimes.com',
    10005: 'bongobd.com',
  };

  function buildGoogleProviderSearchUrl(title, year, langSuffix, provider, intent) {
    const domain = PROVIDER_DOMAINS[provider.provider_id];
    const cleanTitle = (title || '').trim();
    const cleanYear = (year || '').trim();
    const cleanLang = (langSuffix || '').trim();
    
    // For site-restricted searches on specific streaming domains, we omit the release year
    // and language suffix to keep the query broad. This allows Google's spelling corrector
    // to handle transliteration differences (like Aajo vs Ajo) and match pages successfully.
    const query = domain
      ? `${cleanTitle} site:${domain}`.replace(/\s+/g, ' ').trim()
      : `${cleanTitle} ${cleanYear} ${cleanLang} ${provider.provider_name} ${intent}`.replace(/\s+/g, ' ').trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  const movieTitle = details.title || details.name || '';
  const mDate = details.release_date || details.first_air_date;
  const movieYear = mDate ? mDate.split('-')[0] : '';
  const langSuffix = getLanguageSuffix(details.original_language);

  flatrateList.forEach(provider => {
    const href = buildGoogleProviderSearchUrl(movieTitle, movieYear, langSuffix, provider, 'watch');

    const pill = document.createElement('a');
    pill.className = 'provider-pill';
    pill.href = href;
    pill.target = '_blank';
    pill.rel = 'noopener noreferrer';
    pill.title = `Watch "${movieTitle}" on ${provider.provider_name}`;
    
    const logoUrl = provider.logo_path 
      ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
      : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=50&h=50&q=80';
      
    pill.innerHTML = `
      <img src="${logoUrl}" alt="${provider.provider_name}" loading="lazy">
      <span>${provider.provider_name} (${provider.country})</span>
    `;
    
    container.appendChild(pill);
  });

  // Render rent/buy providers
  if (rentList.length > 0 && rentContainer && rentSection) {
    rentSection.style.display = '';
    rentList.forEach(provider => {
      const href = buildGoogleProviderSearchUrl(movieTitle, movieYear, langSuffix, provider, 'rent buy');

      const pill = document.createElement('a');
      pill.className = 'provider-pill provider-pill--rent';
      pill.href = href;
      pill.target = '_blank';
      pill.rel = 'noopener noreferrer';
      pill.title = `Rent/Buy "${movieTitle}" on ${provider.provider_name}`;

      const logoUrl = provider.logo_path
        ? `https://image.tmdb.org/t/p/w92${provider.logo_path}`
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=50&h=50&q=80';

      pill.innerHTML = `
        <img src="${logoUrl}" alt="${provider.provider_name}" loading="lazy">
        <span>${provider.provider_name} (${provider.country})</span>
      `;

      rentContainer.appendChild(pill);
    });
  }
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  
  // API Key submission
  apiKeyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const key = apiKeyInput.value.trim();
    if (key) {
      tmdbApiKey = key;
      localStorage.setItem('tmdb_api_key', key);
      hideApiOverlay();
      
      // Clear previous inputs to prevent mismatching ID systems
      clearBtn.click();
      
      // Auto trigger default search
      discoverMovies();
    }
  });

  // Settings button to re-enter key
  changeKeyBtn.addEventListener('click', () => {
    showApiOverlay();
  });

  // Theme toggle button trigger
  themeToggleBtn.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
  });

  // Shutdown App and Server
  if (shutdownBtn) {
    shutdownBtn.addEventListener('click', async () => {
      if (shutdownOverlay) {
        shutdownOverlay.classList.remove('hidden');
        const appWrapper = document.querySelector('.app-wrapper');
        if (appWrapper) appWrapper.style.opacity = '0.15';
      }
      
      try {
        await fetch('/shutdown');
      } catch (err) {
        console.log('Shutdown request sent (server exiting)');
      }
      
      setTimeout(() => {
        window.close();
      }, 1000);
    });
  }

  // Close details dialog
  closeDialogBtn.addEventListener('click', () => {
    detailDialog.close();
  });
  
  // Close dialog on clicking backdrop (light dismiss)
  detailDialog.addEventListener('click', (e) => {
    if (e.target === detailDialog) {
      detailDialog.close();
    }
  });

  // Reset/Clear button
  clearBtn.addEventListener('click', () => {
    // Clear person states
    selectedActorId = null;
    selectedActressId = null;
    
    // Restore inputs
    actorInputWrapper.classList.remove('hidden');
    actorInput.value = '';
    updateInlineClearButton(actorInput, actorClearBtn);
    actorChip.classList.add('hidden');
    actorSuggestions.innerHTML = '';
    actorSuggestions.classList.add('hidden');
    
    actressInputWrapper.classList.remove('hidden');
    actressInput.value = '';
    updateInlineClearButton(actressInput, actressClearBtn);
    actressChip.classList.add('hidden');
    actressSuggestions.innerHTML = '';
    actressSuggestions.classList.add('hidden');

    // Reset other fields
    titleInput.value = '';
    updateInlineClearButton(titleInput, titleClearBtn);
    yearInput.value = '';
    languageSelect.value = '';
    if (genreSelect) genreSelect.value = '';
    if (ottOnlyCheckbox) ottOnlyCheckbox.checked = false;
    updateHasValue();
    
    // Reset pagination state
    currentPage = 1;
    totalPages = 1;
    totalResults = 0;
    paginationContainer.classList.add('hidden');
    
    // Reset output
    moviesGrid.innerHTML = '';
    moviesGrid.classList.add('hidden');
    emptyState.classList.remove('hidden');
    
    // Reset sort state to default (Ranking)
    currentSort = 'vote_average.desc';
    sortOpts.forEach(opt => {
      opt.classList.toggle('active', opt.dataset.sort === 'vote_average.desc');
    });
    
    // Update empty state icon & text for current mode
    const emptyIcon = document.getElementById('empty-state-icon');
    if (emptyIcon) {
      emptyIcon.setAttribute('data-lucide', currentMode === 'movie' ? 'film' : 'tv');
    }
    const emptyText = document.getElementById('empty-state-text');
    if (emptyText) {
      emptyText.textContent = "Fill out any of the criteria above to start searching. For the best results, select both an actor and actress to find their collaborative work!";
    }
    
    resultsCountText.textContent = 'Ready for discovery';
    sortToolbar.classList.add('hidden');
    
    lucide.createIcons();
  });

  // Submit search form
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentPage = 1; // Reset to page 1 for new search
    discoverMovies();
  });

  // Automatic filtering when checking/unchecking OTT checkbox
  if (ottOnlyCheckbox) {
    ottOnlyCheckbox.addEventListener('change', () => {
      currentPage = 1;
      discoverMovies();
    });
  }

  // Automatic filtering when typing in the title search field (debounced to avoid API spam)
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      updateInlineClearButton(titleInput, titleClearBtn);
    });

    titleInput.addEventListener('input', debounce(() => {
      updateHasValue();
      currentPage = 1;
      discoverMovies();
    }, 400));
  }

  // Automatic filtering when changing the release year
  if (yearInput) {
    yearInput.addEventListener('input', () => {
      updateHasValue();
      currentPage = 1;
      discoverMovies();
    });
  }

  // Automatic filtering when changing original language selection
  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      updateHasValue();
      currentPage = 1;
      discoverMovies();
    });
  }

document.querySelectorAll('input[name="search-mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentMode = e.target.value;
    
    // Update Theme and Icon
    document.body.classList.toggle('series-mode', currentMode === 'tv');
    const logoIconContainer = document.querySelector('.logo-icon');
    if (logoIconContainer) {
      logoIconContainer.innerHTML = `<i data-lucide="${currentMode === 'movie' ? 'film' : 'tv'}"></i>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    // Update Load More text
    const loadMoreText = document.getElementById('load-more-text');
    if (loadMoreText) {
      loadMoreText.textContent = currentMode === 'movie' ? 'Load More Movies' : 'Load More Series';
    }

    // Update App Title
    const appTitle = document.getElementById('main-title');
    if (appTitle) {
      appTitle.textContent = currentMode === 'movie' ? 'Cinema Search' : 'Series Search';
    }

    // Toggle Actor/Actress fields based on API support
    const personFieldsRow = document.getElementById('person-fields-row');
    if (personFieldsRow) {
      if (currentMode === 'tv') {
        personFieldsRow.classList.add('hidden');
      } else {
        personFieldsRow.classList.remove('hidden');
      }
    }
    
    // Also update empty state icon if it's currently visible
    const emptyIcon = document.getElementById('empty-state-icon');
    if (emptyIcon) {
      emptyIcon.setAttribute('data-lucide', currentMode === 'movie' ? 'film' : 'tv');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Update genres dropdown
    if (genreSelect) {
      genreSelect.innerHTML = currentMode === 'movie' ? MOVIE_GENRES : TV_GENRES;
    }
    
    // Clear search fields to prevent queries leaking across modes
    if (titleInput) {
      titleInput.value = '';
      titleInput.placeholder = currentMode === 'movie' 
        ? "e.g. Inception, Breaking Bad, Ocean..." 
        : "e.g. Breaking Bad, The Office, Game of Thrones...";
    }
    if (yearInput) yearInput.value = '';
    
    // Clear actors
    selectedActorId = null;
    selectedActressId = null;
    if (actorChip) actorChip.classList.add('hidden');
    if (actressChip) actressChip.classList.add('hidden');
    if (actorInputWrapper) actorInputWrapper.classList.remove('hidden');
    if (actressInputWrapper) actressInputWrapper.classList.remove('hidden');
    if (actorInput) actorInput.value = '';
    if (actressInput) actressInput.value = '';
    
    updateHasValue();

    currentPage = 1;
    discoverMovies();
  });
});

  // Automatic filtering when changing movie genre selection
  if (genreSelect) {
    genreSelect.addEventListener('change', () => {
      updateHasValue();
      currentPage = 1;
      discoverMovies();
    });
  }

  // Sorting handlers
  // FIX (Bug #3): sorting used to call discoverMovies() again, which re-fetches from
  // TMDb using a sort-dependent server query - pulling a differently-sized pool of
  // results for Ranking vs Popularity vs Release Date. Sorting is now a pure
  // client-side re-order of whatever's already loaded, so switching sort buttons
  // can never change the card count - only the order.
  sortOpts.forEach(opt => {
    opt.addEventListener('click', () => {
      sortOpts.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      
      currentSort = opt.dataset.sort;
      if (activeSearchResults.length > 0) {
        const titleQuery = titleInput ? titleInput.value.trim() : '';
        if (titleQuery) {
          sortActiveResults();
          firstNewCardIndex = -1; // Re-sort is not a "load more"; no stagger animation
          renderMovies(activeSearchResults);
        } else {
          currentPage = 1; // Reset to page 1 on sort change
          discoverMovies();
        }
      }
    });
  });

  // Actor search input autocomplete
  const handleActorInput = debounce(async (e) => {
    const val = e.target.value;
    if (val.trim().length < 2) {
      actorSuggestions.innerHTML = '';
      actorSuggestions.classList.add('hidden');
      return;
    }
    
    actorSpinner.classList.remove('hidden');
    const suggestions = await searchPeople(val, 2); // 2 = Male
    actorSpinner.classList.add('hidden');
    
    renderSuggestions(suggestions, actorSuggestions, 'actor');
  }, 300);

  actorInput.addEventListener('input', handleActorInput);
  actorInput.addEventListener('input', () => {
    updateInlineClearButton(actorInput, actorClearBtn);
  });

  // Actress search input autocomplete
  const handleActressInput = debounce(async (e) => {
    const val = e.target.value;
    if (val.trim().length < 2) {
      actressSuggestions.innerHTML = '';
      actressSuggestions.classList.add('hidden');
      return;
    }
    
    actressSpinner.classList.remove('hidden');
    const suggestions = await searchPeople(val, 1); // 1 = Female
    actressSpinner.classList.add('hidden');
    
    renderSuggestions(suggestions, actressSuggestions, 'actress');
  }, 300);

  actressInput.addEventListener('input', handleActressInput);
  actressInput.addEventListener('input', () => {
    updateInlineClearButton(actressInput, actressClearBtn);
  });

  if (titleClearBtn) {
    titleClearBtn.addEventListener('click', () => {
      titleInput.value = '';
      updateInlineClearButton(titleInput, titleClearBtn);
      updateHasValue();
      currentPage = 1;
      discoverMovies();
      titleInput.focus();
    });
  }

  if (actorClearBtn) {
    actorClearBtn.addEventListener('click', () => {
      actorInput.value = '';
      actorSuggestions.innerHTML = '';
      actorSuggestions.classList.add('hidden');
      actorSpinner.classList.add('hidden');
      updateInlineClearButton(actorInput, actorClearBtn);
      actorInput.focus();
    });
  }

  if (actressClearBtn) {
    actressClearBtn.addEventListener('click', () => {
      actressInput.value = '';
      actressSuggestions.innerHTML = '';
      actressSuggestions.classList.add('hidden');
      actressSpinner.classList.add('hidden');
      updateInlineClearButton(actressInput, actressClearBtn);
      actressInput.focus();
    });
  }

  // Remove selected person event listeners
  removeActorBtn.addEventListener('click', () => {
    selectedActorId = null;
    actorChip.classList.add('hidden');
    actorInputWrapper.classList.remove('hidden');
    actorInput.value = '';
    updateInlineClearButton(actorInput, actorClearBtn);
    actorInput.focus();
    
    // Automatically trigger search on filter removal to update UI
    currentPage = 1;
    discoverMovies();
  });

  removeActressBtn.addEventListener('click', () => {
    selectedActressId = null;
    actressChip.classList.add('hidden');
    actressInputWrapper.classList.remove('hidden');
    actressInput.value = '';
    updateInlineClearButton(actressInput, actressClearBtn);
    actressInput.focus();
    
    // Automatically trigger search on filter removal to update UI
    currentPage = 1;
    discoverMovies();
  });

  // Load more button pagination trigger
  loadMoreBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
      firstNewCardIndex = activeSearchResults.length; // Mark where new cards will start
      currentPage++;
      discoverMovies();
    }
  });

  // Hide suggestions lists when clicking outside
  document.addEventListener('click', (e) => {
    if (!actorInputWrapper.contains(e.target) && !actorSuggestions.contains(e.target)) {
      actorSuggestions.innerHTML = '';
      actorSuggestions.classList.add('hidden');
    }
    if (!actressInputWrapper.contains(e.target) && !actressSuggestions.contains(e.target)) {
      actressSuggestions.innerHTML = '';
      actressSuggestions.classList.add('hidden');
    }
  });

  updateInlineClearButton(titleInput, titleClearBtn);
  updateInlineClearButton(actorInput, actorClearBtn);
  updateInlineClearButton(actressInput, actressClearBtn);

  // Handle window resize to dynamically adjust movie grid row completeness
  window.addEventListener('resize', debounce(() => {
    adjustPartiallyFilledRows();
  }, 100));
}

// --- Theme Helper ---
function applyTheme() {
  if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.setAttribute('data-lucide', 'moon');
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.setAttribute('data-lucide', 'sun');
  }
  lucide.createIcons();
}

// --- Initialization ---

function init() {
  applyTheme();
  setupEventListeners();

  if (!tmdbApiKey) {
    showApiOverlay();
  } else {
    hideApiOverlay();
    // Pre-discover results if API Key is already set
    discoverMovies();
  }
}

// Start application
document.addEventListener('DOMContentLoaded', init);