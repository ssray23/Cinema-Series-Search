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

  /**
   * Check for geo-agnostic UK/US spelling variants for a keyword.
   */
  function getSpellingVariants(kw) {
    if (!kw) return null;
    const ukToUs = {
      'humour': 'humor', 'colour': 'color', 'armour': 'armor',
      'behaviour': 'behavior', 'favour': 'favor', 'favourite': 'favorite',
      'flavour': 'flavor', 'harbour': 'harbor', 'honour': 'honor',
      'labour': 'labor', 'neighbour': 'neighbor', 'rumour': 'rumor',
      'saviour': 'savior', 'theatre': 'theater', 'centre': 'center',
      'defence': 'defense', 'offence': 'offense', 'jewellery': 'jewelry',
      'programme': 'program', 'dialogue': 'dialog'
    };
    const usToUk = {};
    for (const uk in ukToUs) usToUk[ukToUs[uk]] = uk;

    let variant = kw.toLowerCase();
    let hasVariant = false;
    for (const uk in ukToUs) {
      const us = ukToUs[uk];
      const regex = new RegExp(`\\b${uk}\\b`, 'g');
      if (regex.test(variant)) { variant = variant.replace(regex, us); hasVariant = true; }
    }
    if (!hasVariant) {
      for (const us in usToUk) {
        const uk = usToUk[us];
        const regex = new RegExp(`\\b${us}\\b`, 'g');
        if (regex.test(variant)) { variant = variant.replace(regex, uk); hasVariant = true; }
      }
    }
    return hasVariant ? variant : null;
  }

  /**
   * Get semantic TMDb genre IDs from descriptive adjectives/keywords.
   */
  function getSemanticGenreMapping(keywordQuery, currentMode) {
    if (!keywordQuery) return null;
    const genreSynonyms = {
      // Comedy
      'funny': '35', 'hilarious': '35', 'comedy': '35', 'laugh': '35', 'laughs': '35', 'humor': '35', 'humour': '35', 'comedic': '35', 'goofy': '35', 'silly': '35', 'witty': '35', 'satirical': '35', 'satire': '35', 'parody': '35', 'spoof': '35', 'absurd': '35', 'ridiculous': '35', 'lighthearted': '35', 'feel-good': '35', 'feel good': '35,10751', 'cheesy': '35', 'quirky': '35', 'zany': '35', 'banter': '35', 'lol': '35', 'cringe comedy': '35', 'slapstick': '35', 'dry humor': '35', 'black comedy': '35', 'dark comedy': '35', 'romcom': '35,10749', 'buddy comedy': '35', 'office comedy': '35', 'sitcom': '35', 'hysterical': '35', 'amusing': '35', 'comical': '35', 'farcical': '35', 'side-splitting': '35', 'laugh-out-loud': '35', 'rib-tickling': '35', 'riotous': '35',
      // Horror
      'scary': '27', 'spooky': '27', 'horror': '27', 'terrifying': '27', 'frightening': '27', 'creepy': '27', 'gory': '27', 'bloody': '27', 'haunted': '27', 'ghost': '27', 'ghosts': '27', 'haunting': '27', 'possessed': '27', 'possession': '27', 'demon': '27', 'devil': '27', 'monster': '27,14', 'vampire': '27,14', 'zombie': '27,28', 'werewolf': '27', 'slasher': '27', 'supernatural': '27', 'paranormal': '27', 'occult': '27', 'evil': '27', 'nightmare': '27', 'jump scare': '27', 'disturbing': '27', 'macabre': '27', 'sinister': '27', 'eerie': '27', 'chilling': '27', 'psychological horror': '27', 'body horror': '27', 'demonic': '27', 'nightmarish': '27', 'gruesome': '27', 'bloodcurdling': '27', 'hair-raising': '27',
      // Drama
      'sad': '18', 'depressing': '18', 'drama': '18', 'emotional': '18', 'tearjerker': '18,10749', 'dramatic': '18', 'heartbreaking': '18', 'moving': '18', 'touching': '18', 'realistic': '18', 'character driven': '18', 'relationship': '18', 'family conflict': '18', 'life story': '18', 'coming of age': '18,10751', 'grief': '18', 'loss': '18', 'hope': '18', 'inspirational': '18', 'tragic': '18', 'melancholy': '18', 'powerful': '18', 'serious': '18', 'intense': '18', 'human': '18', 'heartfelt': '18', 'soulful': '18', 'poignant': '18', 'raw': '18', 'award worthy': '18', 'oscar': '18', 'emotional rollercoaster': '18', 'gut-wrenching': '18', 'somber': '18', 'bittersweet': '18', 'melodrama': '18', 'melodramatic': '18', 'sombre': '18',
      // Romance
      'romantic': '10749', 'love': '10749', 'romance': '10749', 'lovey dovey': '10749', 'dating': '10749', 'couple': '10749', 'marriage': '10749', 'wedding': '10749', 'heartwarming': '10749', 'kiss': '10749', 'passion': '10749', 'affair': '10749', 'love story': '10749', 'first love': '10749', 'breakup': '10749', 'soulmate': '10749', 'chemistry': '10749', 'flirting': '10749', 'crush': '10749', 'honeymoon': '10749', 'valentine': '10749', 'boyfriend': '10749', 'girlfriend': '10749', 'falling in love': '10749', 'second chance': '10749', 'enemies to lovers': '10749', 'friends to lovers': '10749', 'romantic comedy': '10749', 'passionate': '10749', 'sweethearts': '10749', 'intimate': '10749', 'amorous': '10749', 'swoon': '10749', 'date-night': '10749', 'swoon-worthy': '10749', 'affectionate': '10749', 'star-crossed': '10749',
      // Action
      'action': '28', 'exciting': '28', 'explosion': '28', 'explosive': '28', 'badass': '28', 'kickass': '28', 'guns': '28', 'gunfight': '28', 'shootout': '28', 'car chase': '28', 'martial arts': '28,80', 'combat': '28', 'fight': '28', 'fighting': '28', 'warrior': '28', 'assassin': '28', 'mercenary': '28', 'hero': '28', 'revenge': '28', 'adrenaline': '28', 'high octane': '28', 'mission': '28', 'spy': '28,53', 'espionage': '28,53', 'stunts': '28', 'battle': '28', 'survival': '12,53,28', 'fast paced': '28', 'blockbuster': '28', 'military action': '28', 'hand to hand': '28', 'edge of your seat': '53,28', 'high-octane': '28', 'chase': '28', 'stunt': '28', 'heroic': '28', 'fast-paced': '28', 'frenetic': '28', 'pulse-pounding': '28', 'adrenaline-pumping': '28',
      // Sci-Fi
      'scifi': '878', 'sci-fi': '878', 'science fiction': '878', 'space': '878', 'alien': '878', 'aliens': '878', 'ufo': '878', 'future': '878', 'futuristic': '878', 'robot': '878', 'android': '878', 'cyborg': '878', 'ai': '878', 'artificial intelligence': '878', 'time travel': '878', 'parallel universe': '878', 'multiverse': '878', 'dystopian': '878', 'utopian': '878', 'spaceship': '878', 'galaxy': '878', 'planet': '878', 'mars': '878', 'moon': '878', 'space station': '878', 'cyberpunk': '878', 'post apocalyptic': '878,28', 'clone': '878', 'genetics': '878', 'virtual reality': '878', 'simulation': '878', 'technology': '878', 'high tech': '878', 'quantum': '878', 'tech': '878', 'space-opera': '878', 'otherworldly': '878', 'intergalactic': '878', 'technological': '878',
      // Fantasy
      'magic': '14', 'fantasy': '14', 'wizard': '14', 'witch': '14', 'magical': '14', 'mythical': '14', 'dragon': '14', 'dragons': '14', 'elf': '14', 'elves': '14', 'orc': '14', 'fairy': '14', 'fairytale': '14', 'kingdom': '14', 'castle': '14', 'enchanted': '14', 'spell': '14', 'sorcery': '14', 'sword': '14', 'legend': '14', 'myth': '14', 'epic fantasy': '14', 'creature': '14', 'prophecy': '14', 'chosen one': '14', 'medieval': '14', 'dungeon': '14', 'quest': '14', 'magic school': '14,10751', 'fantastical': '14', 'supernatural world': '14', 'sorcerer': '14', 'fairy tale': '14', 'mythological': '14', 'supernatural': '14', 'epic': '14', 'enchanting': '14',
      // Mystery
      'mystery': '9648', 'who done it': '9648', 'whodunnit': '9648', 'mysterious': '9648', 'detective': '9648', 'investigation': '9648', 'investigate': '9648', 'clues': '9648', 'clue': '9648', 'missing': '9648', 'disappearance': '9648', 'murder mystery': '9648', 'unsolved': '9648', 'secret': '9648', 'hidden truth': '9648', 'conspiracy': '9648', 'case': '9648', 'cold case': '9648', 'crime solving': '9648', 'puzzle': '9648', 'twist': '9648', 'twisty': '9648,53', 'reveal': '9648', 'suspect': '9648', 'suspicious': '9648', 'private investigator': '9648', 'noir': '80,9648,53', 'sleuth': '9648', 'enigmatic': '9648', 'mind game': '9648', 'enigma': '9648', 'intrigue': '9648', 'whodunit': '9648', 'baffling': '9648', 'cryptic': '9648', 'investigative': '9648',
      // Adventure
      'adventure': '12', 'adventurous': '12', 'journey': '12', 'expedition': '12', 'treasure': '12', 'treasure hunt': '12', 'exploration': '12', 'explore': '12', 'discovery': '12', 'travel': '12', 'wilderness': '12', 'island': '12', 'jungle': '12', 'mountain': '12', 'desert': '12', 'voyage': '12', 'odyssey': '12', 'epic': '12,14,28', 'road trip': '12,35', 'trek': '12', 'heroic': '12', 'escape': '12', 'globe trotting': '12', 'explorer': '12', 'epic journey': '12', 'swashbuckling': '12',
      // Animation
      'animation': '16', 'animated': '16', 'cartoon': '16', 'anime': '16,14,878', 'pixar': '16', 'disney': '16', 'dreamworks': '16', 'cgi': '16', '3d animation': '16', '2d animation': '16', 'stop motion': '16', 'kids animation': '16', 'family animation': '16', 'animated movie': '16', 'anime film': '16', 'manga': '16', 'stylized': '16', 'voice acting': '16', 'illustrated': '16', 'cel animation': '16', 'animated adventure': '16', 'animated comedy': '16', 'animated fantasy': '16', 'anime series': '16', 'claymation': '16', 'cartoonish': '16', 'drawn': '16', 'illustrative': '16',
      // Crime
      'crime': '80', 'criminal': '80', 'robbery': '80', 'heist': '80,28', 'mafia': '80', 'mob': '80', 'gangster': '80', 'cartel': '80', 'drug': '80', 'drugs': '80', 'police': '80', 'cop': '80', 'serial killer': '80,53,27', 'murder': '80', 'murderer': '80', 'thief': '80', 'con artist': '80', 'fraud': '80', 'underworld': '80', 'organized crime': '80', 'gang': '80', 'forensics': '80', 'courtroom': '80,18', 'law': '80', 'prison': '80', 'jail': '80', 'corruption': '80', 'hitman': '80', 'money laundering': '80', 'crime boss': '80', 'noir': '80', 'illicit': '80',
      // Documentary
      'documentary': '99', 'doc': '99', 'docu': '99', 'factual': '99', 'real life': '99', 'true story': '99', 'true events': '99', 'based on real events': '99,36,18', 'history': '99', 'nature': '99', 'wildlife': '99', 'science': '99', 'space documentary': '99', 'biography': '99', 'biopic': '99', 'social issues': '99', 'politics': '99', 'environment': '99', 'investigative': '99', 'educational': '99', 'non fiction': '99', 'real people': '99', 'archive footage': '99', 'interviews': '99', 'current affairs': '99', 'culture': '99', 'travel documentary': '99', 'food documentary': '99', 'nonfiction': '99', 'expose': '99', 'real-world': '99', 'biographical': '99', 'exposé': '99', 'informative': '99', 'non-fiction': '99',
      // Family
      'family': '10751', 'kids': '10751', 'children': '10751', 'wholesome': '10751', 'parents': '10751', 'siblings': '10751', 'mother': '10751', 'father': '10751', 'daughter': '10751', 'son': '10751', 'grandparents': '10751', 'everyone': '10751', 'all ages': '10751', 'uplifting': '10751', 'cute': '10751', 'friendly': '10751', 'holiday movie': '10751', 'christmas': '10751', 'festive': '10751', 'animals': '10751', 'pets': '10751', 'family friendly': '10751', 'young audience': '10751', 'coming together': '10751', 'positive': '10751', 'warming': '10751', 'kid friendly': '10751', 'heartwarming': '10751', 'kid-friendly': '10751', 'g-rated': '10751',
      // History
      'historical': '36', 'period piece': '36', 'ancient': '36', 'victorian': '36', 'roman': '36', 'greek': '36', 'empire': '36', 'king': '36', 'queen': '36', 'monarchy': '36', 'royal': '36', 'civil war': '36', 'world war': '36', 'renaissance': '36', 'revolution': '36', 'true history': '36', 'historically accurate': '36', 'biographical': '36', 'colonial': '36', 'dynasty': '36', 'past': '36', 'heritage': '36', 'traditional': '36', 'old england': '36', 'old times': '36', 'history drama': '36', 'medieval': '36', 'biopic': '36', 'period drama': '36', 'period': '36', 'historical-drama': '36', 'costume drama': '36', 'retrospective': '36',
      // Music
      'music': '10402', 'musical': '10402', 'singing': '10402', 'songs': '10402', 'concert': '10402', 'band': '10402', 'orchestra': '10402', 'choir': '10402', 'opera': '10402', 'rock': '10402', 'pop': '10402', 'jazz': '10402', 'classical': '10402', 'rap': '10402', 'hip hop': '10402', 'dance': '10402', 'performance': '10402', 'performer': '10402', 'composer': '10402', 'musician': '10402', 'singer': '10402', 'guitar': '10402', 'piano': '10402', 'festival': '10402', 'broadway': '10402', 'stage': '10402', 'show tunes': '10402', 'idol': '10402', 'karaoke': '10402', 'soundtrack': '10402', 'musical-theater': '10402', 'choreographed': '10402', 'operatic': '10402', 'symphonic': '10402', 'rhythmic': '10402',
      // Thriller
      'thriller': '53', 'thrilling': '53', 'suspense': '53', 'suspenseful': '53', 'tense': '53', 'psychological': '53,18', 'mind bending': '878,53,9648', 'cat and mouse': '53', 'race against time': '53', 'danger': '53', 'stalker': '53', 'kidnapping': '53', 'hostage': '53', 'betrayal': '53', 'paranoia': '53', 'high stakes': '53', 'chase': '53', 'manhunt': '53', 'cover up': '53', 'nail biting': '53', 'gripping': '53', 'edge of seat': '53', 'edge-of-seat': '53', 'mind-bending': '53',
      // War
      'war': '10752', 'military': '10752', 'soldier': '10752', 'army': '10752', 'navy': '10752', 'air force': '10752', 'wwii': '10752', 'ww2': '10752', 'wwi': '10752', 'vietnam': '10752', 'iraq': '10752', 'afghanistan': '10752', 'battlefield': '10752', 'sniper': '10752', 'commando': '10752', 'special forces': '10752', 'frontline': '10752', 'troops': '10752', 'resistance': '10752', 'occupation': '10752', 'conflict': '10752', 'patriot': '10752', 'naval': '10752', 'tank': '10752', 'fighter pilot': '10752', 'war drama': '10752', 'war epic': '10752', 'invasion': '10752', 'combat zone': '10752', 'ww1': '10752', 'trench': '10752', 'tactical': '10752',
      // Western
      'western': '37', 'cowboy': '37', 'wild west': '37', 'gunslinger': '37', 'sheriff': '37', 'outlaw': '37', 'saloon': '37', 'horse': '37', 'horses': '37', 'duel': '37', 'frontier': '37', 'ranch': '37', 'gold rush': '37', 'bounty hunter': '37', 'revolver': '37', 'rifle': '37', 'native american': '37', 'wagon': '37', 'stagecoach': '37', 'dusty': '37', 'old west': '37', 'lawman': '37', 'bandit': '37', 'frontiersman': '37', 'cattle': '37', 'prairie': '37', 'six shooter': '37', 'horseback': '37', 'spaghetti western': '37',

      // Cross-Genre Mappings
      'mind blowing': '878,53,9648',
      'mindfuck': '878,53,9648',
      'plot twist': '9648,53',
      'based on true story': '99,36,18',
      'buddy cop': '35,80,28',
      'superhero': '28,12,878',
      'super powers': '28,14,878',
      'political thriller': '53,18',
      'creature feature': '27,878'
    };

    const kwLower = keywordQuery.toLowerCase();
    if (!genreSynonyms[kwLower]) return null;
    
    let mappedGenreId = genreSynonyms[kwLower];
    if (currentMode === 'tv') {
      const tvTranslations = {
        '28': '10759', '12': '10759', // Action, Adventure -> Action & Adventure
        '878': '10765', '14': '10765', // Sci-Fi, Fantasy -> Sci-Fi & Fantasy
        '10752': '10768', // War -> War & Politics
        '27': '9648', // Horror -> Mystery (closest TV equivalent)
        '53': '9648', // Thriller -> Mystery (closest TV equivalent)
        '36': '99', // History -> Documentary
        '10402': '10767', // Music -> Talk
        '10749': '18' // Romance -> Drama (closest TV equivalent)
      };
      mappedGenreId = mappedGenreId.split(',').map(id => tvTranslations[id] || id).join(',');
    }
    return mappedGenreId;
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
    generateYearOptions,
    getSpellingVariants,
    getSemanticGenreMapping,
    
    /**
     * Asynchronously query Datamuse API to find related words for a given keyword,
     * and check if any of those words map to a genre in our semantic dictionary.
     */
    getDatamuseGenreMapping: async function(keywordQuery, currentMode) {
      if (!keywordQuery) return null;
      try {
        // Run network fetch to Datamuse
        const dmRes = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(keywordQuery)}&max=10`);
        if (dmRes.ok) {
          const dmWords = await dmRes.json();
          // Evaluate returned words against semantic dictionary
          for (const wordObj of dmWords) {
            const mapped = getSemanticGenreMapping(wordObj.word, currentMode);
            if (mapped) {
              return mapped; // Found our genre mapping!
            }
          }
        }
      } catch (e) {
        console.error('Datamuse API error:', e);
      }
      return null;
    }
  };
}));

