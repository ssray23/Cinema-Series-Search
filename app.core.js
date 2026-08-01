/**
 * CineSearch Core Business Logic Module
 * Universal Module Definition (UMD) supporting Node.js testing and browser execution.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CineSearchCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Check if a movie result is likely a TV series, season, episode, or unscripted special.
   */
  function isLikelyTvSeriesOrSpecial(movie) {
    if (!movie) return false;
    const title = (movie.title || movie.name || '').toLowerCase();
    const overview = (movie.overview || '').toLowerCase();

    // 1. Filter out TMDb TV Movie genre (10770)
    if (movie.genre_ids && Array.isArray(movie.genre_ids) && movie.genre_ids.includes(10770)) {
      return true;
    }

    // 2. Filter out TV episode / season / series formats in the title
    const episodePattern = /\b(episode|season|tv series|tv show|television series|web series|miniseries|mini-series|talk show|game show|reality show|stand-up|stand up|comedy special|comedy show)\b/i;
    if (episodePattern.test(title)) {
      return true;
    }

    // 2b. Filter out S01E01-style season/episode numbering in the title
    if (/\bS\d{1,2}\s*E\d{1,2}\b/i.test(title)) {
      return true;
    }

    // 3. Filter out items whose overview contains TV show / live show / stand-up special indicators
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
      'stand-up comedy',
      'stand up comedy',
      'stand-up special',
      'stand up special',
      'comedy special',
      'stand-up comedian',
      'stand up comedian',
      'stand-up comic',
      'standup comedy',
      'in this special',
      'in his special',
      'in her special',
      'his comedy special',
      'her comedy special',
      'this comedy special',
      'comedy concert',
      'comedy tour',
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

    // 4b. "PersonName: Title" with NO genre tags = performance special
    const hasColon = title.includes(':');
    const hasNoGenres = !movie.genre_ids || movie.genre_ids.length === 0;
    if (hasColon && hasNoGenres) {
      return true;
    }

    // 5. Filter by runtime — anything under 40 minutes is a short film
    if (typeof movie.runtime === 'number' && movie.runtime > 0 && movie.runtime < 40) {
      return true;
    }

    return false;
  }

  /**
   * Return language suffix for search queries.
   */
  function getLanguageSuffix(movieOriginalLanguage, activeLangCode) {
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
   * Calculate title relevance match score
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
   * Substring match requiring word boundaries.
   */
  function matchesOttKeyword(text, keyword) {
    if (!text || !keyword) return false;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    const isAlnum = (ch) => ch !== undefined && /[a-z0-9]/.test(ch);
    let idx = lowerText.indexOf(lowerKeyword);
    while (idx !== -1) {
      if (!isAlnum(lowerText[idx - 1]) && !isAlnum(lowerText[idx + lowerKeyword.length])) {
        return true;
      }
      idx = lowerText.indexOf(lowerKeyword, idx + 1);
    }
    return false;
  }

  /**
   * Detect user's ISO 3166-1 country code from language or timezone.
   */
  function detectWatchRegion(lang, customTz) {
    try {
      const indianLanguages = ['hi', 'bn', 'ta', 'te', 'ml', 'mr', 'kn', 'gu', 'pa'];
      if (lang && indianLanguages.includes(lang)) {
        return 'IN';
      }

      const tz = customTz || (typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '') || '';
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
   * Weighted rating calculation with vote count dampening.
   */
  function weightedRating(item, currentMode) {
    if (!item) return 0;
    const voteCount = item.vote_count || 0;
    const voteAverage = item.vote_average || 0;
    const minVotes = (currentMode === 'tv') ? 5 : 15;
    if (voteCount >= minVotes) return voteAverage;
    return voteAverage * (voteCount / minVotes);
  }

  /**
   * Comparator for sorting active results.
   */
  function compareBySort(a, b, currentSort, currentMode) {
    if (currentSort === 'vote_average.desc') {
      return weightedRating(b, currentMode) - weightedRating(a, currentMode);
    } else if (currentSort === 'vote_count.desc') {
      return (b.vote_count || 0) - (a.vote_count || 0);
    } else if (currentSort === 'primary_release_date.desc') {
      return new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0);
    }
    return (b.popularity || 0) - (a.popularity || 0);
  }

  /**
   * Build Google semantic search URL for streaming providers.
   */
  function buildGoogleProviderSearchUrl(title, year, langSuffix, provider, intent) {
    const cleanTitle = (title || '').trim();
    const cleanYear = (year || '').trim();
    const cleanLang = (langSuffix || '').trim();
    const providerName = (provider && provider.provider_name) ? provider.provider_name.trim() : '';
    const cleanIntent = (intent || 'watch online').trim();

    const query = `${cleanTitle} ${cleanYear} ${cleanLang} ${providerName} ${cleanIntent}`.replace(/\s+/g, ' ').trim();
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  /**
   * Strict CoT JSON Parser for AI OTT predictions (Gemini & Claude).
   * Validates year_match and explicit_confirmation before accepting platform name.
   */
  function parseAiJsonCotResponse(responseText, validPlatforms) {
    if (!responseText) return null;
    let jsonText = responseText.trim();
    const markdownMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      jsonText = markdownMatch[1].trim();
    }
    
    try {
      const data = JSON.parse(jsonText);
      if (!data || typeof data !== 'object') return null;

      // Verify Chain-of-Thought reasoning checks
      const yearMatch = String(data.year_match || '').toLowerCase();
      const explicitConfirm = String(data.explicit_confirmation || '').toLowerCase();

      if (yearMatch !== 'yes' || explicitConfirm !== 'yes') {
        return null; // Rejected due to unconfirmed year or lack of explicit stream rights
      }

      const platform = (data.platform || '').trim();
      if (!platform || platform.toLowerCase() === 'none' || platform.toLowerCase() === 'unreleased') {
        return null;
      }

      if (validPlatforms && Array.isArray(validPlatforms) && validPlatforms.length > 0) {
        const matchesPlatform = validPlatforms.some(p => matchesOttKeyword(platform, p));
        if (!matchesPlatform) return null;
      }

      return platform;
    } catch (e) {
      return null;
    }
  }

  /**
   * Generate array of year numbers from maxYear down to startYear.
   */
  function generateYearOptions(startYear = 1900, maxYear = new Date().getFullYear()) {
    const years = [];
    for (let y = maxYear; y >= startYear; y--) {
      years.push(y);
    }
    return years;
  }

  return {
    isLikelyTvSeriesOrSpecial,
    getLanguageSuffix,
    fuzzyMatch,
    getTitleMatchScore,
    matchesOttKeyword,
    detectWatchRegion,
    weightedRating,
    compareBySort,
    buildGoogleProviderSearchUrl,
    parseAiJsonCotResponse,
    generateYearOptions
  };
}));

