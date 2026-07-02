# 🎬 Cinema Search

A sleek, premium movie discovery web app powered by [The Movie Database (TMDb) API](https://www.themoviedb.org/). Search for films by title, cast, year, language, genre, and streaming availability — all from a beautiful dark-mode desktop app.

---

## ✨ Features

### 🔍 Smart Search
- **Movie Title / Keyword** — Type any title or keyword and results update automatically as you type (debounced to avoid API spam).
- **Actor & Actress** — Real-time autocomplete with profile photo suggestions. Select both to find their collaborative films together.
- **Release Year** — Filter by a specific year.
- **Original Language** — Filter by the film's original production language (Hindi, Tamil, English, French, etc.).
- **Movie Genre** — Filter by genre (Action, Comedy, Drama, Thriller, Sci-Fi, etc.).
- **OTT Only** — Tick the checkbox to show only movies available for flatrate streaming on OTT platforms in your region.

### ⚡ Fully Reactive
Every filter updates results **instantly** — no need to hit a search button after your initial search. Changing any field (title, year, language, genre, OTT toggle) automatically refreshes the results in real time.

### 🎭 Movie Detail Card
Click any movie card to open a full-detail modal showing:
- High-resolution backdrop image
- Title, release year, runtime, and genres
- TMDb rating and vote count
- Full synopsis
- **OTT streaming providers** available in your region (clickable — takes you directly to the platform's search page for that movie)
- **🔍 Search with Google** button — searches `"{title} {year} the movie"` to avoid ambiguous results

### 🧠 Hybrid Search Strategy
The app intelligently switches between two TMDb endpoints:
- **Title search mode** (`/search/movie`) — when a title/keyword is typed. Genre and language filters are applied client-side.
- **Discover mode** (`/discover/movie`) — when actor/actress is selected (without a title). Genre, language, OTT availability, and year are applied natively via TMDb API parameters.

### 🖥️ Desktop App (macOS)
Cinema Search runs as a native-feeling **desktop application** via a double-clickable icon on your Desktop:
- **Double-click** the icon to launch — opens the app in your default browser automatically.
- If the tab was accidentally closed, double-clicking again **reopens it**.
- The app runs a lightweight local Python server (`server.py`) on port `8080`.

### ⚙️ Other Controls (top-right header)
| Button | Action |
|---|---|
| ☀️ / 🌙 | Toggle between dark and light theme |
| ⚙️ | Change your TMDb API key |
| ⏻ | Gracefully shut down the local server and close the browser tab |

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

### Basic Movie Search
1. Type a movie title in the **Movie Title / Keyword** field — results appear as you type.
2. Optionally add a **Year**, **Language**, or **Genre** to narrow results.
3. Tick **Only show movies available to stream on OTTs** to filter for streaming availability.

### Cast Search (Find Collaborative Films)
1. Type an actor's name in the **Actor** field and select from the autocomplete suggestions.
2. Optionally do the same for **Actress**.
3. Results show all films featuring the selected person(s). Add genre, year, or language to refine further.
4. Click **Reset Filters** to clear everything and start fresh.

### Movie Detail
- Click any movie card to open its full detail modal.
- Click an **OTT platform pill** (e.g. Netflix, Zee5, Prime Video) to go directly to that platform's search page for the movie.
- Click **Search with Google** to open a targeted Google search for the movie.
- Press **Esc** or click outside the modal to close it.

### Sorting
Once results are shown, use the sort bar to reorder by:
- ⭐ **Ranking** — TMDb vote average (filters out low-vote films)
- 🔥 **Popularity** — TMDb popularity score
- 📅 **Release Date** — newest first

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
