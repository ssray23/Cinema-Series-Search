# 🎬 CineSearch — Cinema & Series Discovery

A sleek, premium movie and TV series discovery web app powered by [The Movie Database (TMDb) API](https://www.themoviedb.org/). Search for films and TV shows by title, cast, year, language, genre, and streaming availability — all from a beautiful dark-mode desktop app.

---

## ✨ Features

### 📺 Dual Mode Discovery
- **Cinema / Movies** — Browse feature films, blockbusters, and indie movies.
- **Series / TV Shows** — Discover TV series, reality shows, anime, and mini-series.
- **Dynamic UI Adapting** — Toggle between modes to automatically shift the interface background gradients (soft pastel CMYK red for Cinema mode, teal-ish blue for Series mode), control button outlines, genres, search placeholders, and TMDB discovery queries.

### 🔍 Smart Search
- **Title / Keyword** — Type any title or keyword and results update automatically as you type (debounced to avoid API spam).
- **Actor & Actress** — Real-time autocomplete with profile photo suggestions. Select both to find their collaborative titles together.
- **Release Year / First Air Date** — Filter by a specific year.
- **Original Language** — Filter by the title's original production language (Hindi, Bengali, English, French, Japanese, etc.).
- **Dynamic Genres** — Filter by genres matching the active mode (e.g. Clapperboard updates dynamically to Movie genres or TV genres).
- **OTT Only** — Tick the checkbox to show only titles available for flatrate streaming on OTT platforms in your region.

### ⚡ Fully Reactive
Every filter updates results **instantly** — no need to hit a search button. Changing any criteria (title, year, language, genre, OTT toggle, or sort order) automatically refreshes the results in real time.

### 🎭 Media Detail Card
Click any card to open a full-detail modal showing:
- High-resolution backdrop image
- Title, release/air year, runtime, and genres
- TMDb rating and vote count
- Full synopsis
- **OTT streaming providers** available in your region (clickable — takes you directly to the platform's search page for that title)
- **🔍 Search with Google** button — searches `"{title} {year}"` to avoid ambiguous results

### 🧠 Hybrid Search Strategy
The app intelligently switches between two TMDb API pipelines:
- **Title search mode** (`/search/movie` & `/search/tv`) — when a title/keyword is typed. Genre and language filters are applied client-side.
- **Discover mode** (`/discover/movie` & `/discover/tv`) — when actor/actress is selected (without a title). Genre, language, and year are applied natively via TMDb API parameters.

### 🎯 "Show Everything" Philosophy
- **No vote-count hiding** — Even a title with a single vote appears in results. The left-hand filters (title, year, language, genre, cast, OTT) are the only constraints.
- **Smart ranking without exclusion** — The **Ranking** sort uses a `weightedRating` formula that dampens low-confidence (few-vote) titles down in the list instead of hiding them. A fresh OTT original with 2 votes and a 9.0 average still shows; it just ranks lower than a 5,000-vote 8.0 average.

---

## 🚀 Getting Started

### Step 1 — Get Your Free API Keys

CineSearch requires three free API keys to function fully:
1. **TMDb API Key** (Core metadata): Sign up at [themoviedb.org](https://www.themoviedb.org/) → Account Settings → API.
2. **Watchmode API Key** (Primary streaming data): Sign up at [watchmode.com](https://api.watchmode.com/).
3. **Gemini API Key** (AI fallback prediction): Get a free key at [Google AI Studio](https://aistudio.google.com/).

### Step 2 — Configure the `.env` File
In the root directory of the project, create or edit the `.env` file and paste your keys:
```
TMDB_API_KEY=your_tmdb_key_here
WATCHMODE_API_KEY=your_watchmode_key_here
GEMINI_API_KEY=your_gemini_key_here
```
*Note: The app will gracefully degrade if the Watchmode or Gemini keys are missing, but the TMDb key is required.*

### Step 3 — Launch the App

#### Option A: Desktop App (macOS — recommended)
Double-click the **Cinema Search** icon on your Desktop. The app starts the server and opens in your browser automatically.

#### Option B: Manual launch
```bash
cd "/Users/suddharay/Library/Mobile Documents/com~apple~CloudDocs/Mac Projects/Cinema Search"
python3 server.py
```
Then open [http://localhost:8080](http://localhost:8080) in your browser.

---

## 🎮 How to Use

### Switch Modes (Movies vs. Series)
- Select the **Cinema** or **Series** button at the top header to search for movies or TV shows respectively.

### Basic Title Search
1. Type a title in the **Title / Keyword** field — results appear as you type.
2. Optionally add a **Year**, **Language**, or **Genre** to narrow results.
3. Tick **Only show titles available to stream on OTTs** to filter for streaming availability.

### Cast Search (Find Collaborative Titles)
1. Type an actor's name in the **Actor** field and select from autocomplete suggestions.
2. Optionally do the same for **Actress**.
3. Results show all collaborative films/shows featuring the selected people. Add genre, year, or language to refine further.
4. Click **Reset Filters** to clear everything and start fresh.

### Detail View
- Click any card to open its detail modal.
- Click an **OTT platform pill** (e.g. Netflix, Zee5, Prime Video, Hoichoi) to go directly to that platform's search page.
- Click **Search with Google** to open a targeted Google search for the title.

### Sorting
Once results are shown, use the sort bar to reorder by:
- ⭐ **Ranking** — TMDb vote average (with language-aware minimum vote thresholds)
- 🔥 **Popularity** — Most Reviewed (sorted by total number of votes/reviews)
- 📅 **Release Date / First Air Date** — newest first

---

## 🧬 How It Works

### The Smart Fetch Strategy

CineSearch uses an intelligent three-stage pipeline to balance **speed** (fewer API calls), **completeness** (no vote-count hiding), and **quality** (real titles, not spam):

1. **Server-side pool selection**
   - **Ranking sort**: Fetch by popularity (not vote-average), avoiding the pathological tail of obscure 1-vote festival shorts
   - **Release Date sort**: Always fetch by true date order (newest-first)
   - **Popularity sort**: Fetch by vote_count to surface the most reviewed titles (pass-through)

2. **Client-side filtering & verification**
   - Title fuzzy-match (when title is typed)
   - Language filter (exact match on `original_language`)
   - Genre filter (quick `Array.includes`)
   - **OTT verification** (the expensive one): For each candidate title, fetch its provider details from TMDb's `/watch/providers` endpoint and check if it's streamable in your region

3. **Auto-pagination with smart loop**
   - The fetch loop targets **15+ results per page** and adapts:
     - **OTT off**: Stops after max 10 pages of attempts (most filters are cheap)
     - **OTT on**: Allows up to 25 pages (each title requires an extra API call to verify providers, so it digs deeper to accumulate enough streamable titles)
   - **Important**: The loop accumulates results *in sort order* — when OTT filtering strips 80% of a page, the next page's newest or highest-rated titles still preserve their intended order

### Ranking Without Exclusion

The `weightedRating()` function (line 456) ensures low-vote titles don't get hidden:

```javascript
function weightedRating(item) {
  const voteCount = item.vote_count || 0;
  const voteAverage = item.vote_average || 0;
  const minVotes = currentMode === 'tv' ? 5 : 15;
  if (voteCount >= minVotes) return voteAverage;
  return voteAverage * (voteCount / minVotes);
}
```

Example: A Bengali OTT original with **2 votes and 9.0 average** scores as `9.0 × (2/15) = 1.2`, ranking lower than a **5,000-vote 8.0** average (which scores as `8.0`). But the 2-vote title still **appears** — it's not hidden, just re-ranked fairly.

### Hybrid Search Endpoints

- **Title search** (`/search/movie`, `/search/tv`): When you type a keyword, the app uses TMDb's full-text search (cheaper, no cast support)
- **Discover mode** (`/discover/movie`, `/discover/tv`): When you select an actor, the app switches to discover (supports cast filtering via `with_cast`)
- Genre, language, and year filters apply client-side in search mode (TMDb's search endpoint doesn't support them) and server-side in discover mode (for efficiency)

---

## 🗂️ Project Files

| File | Purpose |
|---|---|
| `index.html` | App structure and all UI components |
| `app.js` | All search logic, API calls, event listeners, and rendering |
| `styles.css` | Full design system — dark/light themes, animations, glassmorphism |
| `server.py` | Lightweight Python HTTP server (serves the app on port 8080 with strict no-cache headers for dev) |
| `README.md` | This file |

---

## 🔑 API Key & Privacy

- Your TMDb API key is stored **only in your browser's `localStorage`** — it is never sent anywhere except directly to the TMDb API.
- The app makes all requests client-side. No data is logged or stored on any server.

---

## 🛠️ Requirements

- **macOS** (for the desktop app launcher)
- **Python 3** (pre-installed on all modern Macs) — used to run the local server
- A modern browser (Safari, Chrome, Firefox)
- A free [TMDb API key](https://www.themoviedb.org/settings/api)
