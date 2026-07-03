# 🎬 CineSearch — Cinema & Series Discovery

A sleek, premium movie and TV series discovery web app powered by [The Movie Database (TMDb) API](https://www.themoviedb.org/). Search for films and TV shows by title, cast, year, language, genre, and streaming availability — all from a beautiful dark-mode desktop app.

---

## ✨ Features

### 📺 Dual Mode Discovery
- **Cinema / Movies** — Browse feature films, blockbusters, and indie movies.
- **Series / TV Shows** — Discover TV series, reality shows, anime, and mini-series.
- **Dynamic UI Adapting** — Toggle between modes to automatically shift the interface colors, genres, search placeholders, and TMDB discovery queries.

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

### ⚙️ Adaptive Vote Thresholds
- To ensure high-quality results when using **Ranking** sort, CineSearch implements dynamic minimum vote thresholds.
- When searching "Any Language" or English, it uses high vote thresholds (up to 200 votes) to screen out low-quality spam.
- When searching regional/sparse catalogs (like Bengali or Marathi), the threshold automatically scales down to 5–10 votes so no titles are hidden.

---

## 🚀 Getting Started

### Step 1 — Get a Free TMDb API Key

1. Sign up (free) at [themoviedb.org](https://www.themoviedb.org/).
2. Go to **Account Settings → API**.
3. Request an API key — select **Developer** if prompted.
4. Copy the **API Key (v3 auth)** — it looks like a 32-character hex string.

### Step 2 — Launch the App

#### Option A: Desktop App (macOS — recommended)
Double-click the **Cinema Search** icon on your Desktop. The app starts the server and opens in your browser automatically.

#### Option B: Manual launch
```bash
cd "/Users/suddharay/Library/Mobile Documents/com~apple~CloudDocs/Mac Projects/Cinema Search"
python3 server.py
```
Then open [http://localhost:8080](http://localhost:8080) in your browser.

### Step 3 — Enter Your API Key
On first launch, a prompt will appear asking for your TMDb API key. Paste it in and click **Save API Key**. The key is stored in your browser's `localStorage` — it never leaves your device.

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
- 🔥 **Popularity** — TMDb popularity score
- 📅 **Release Date / First Air Date** — newest first

---

## 🗂️ Project Files

| File | Purpose |
|---|---|
| `index.html` | App structure and all UI components |
| `app.js` | All search logic, API calls, event listeners, and rendering |
| `styles.css` | Full design system — dark/light themes, animations, glassmorphism |
| `server.py` | Lightweight Python HTTP server (serves the app on port 8080) |
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
