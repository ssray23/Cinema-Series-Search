# macOS Design System & Styling Specification

This document details the complete design language, component architecture, color harmony rules, typography system, and layout guidelines implemented in the **Cinema Search** application to achieve a native macOS system interface look and feel.

---

## 1. Core Design Philosophy

- **Native macOS Aesthetics**: Frosted glassmorphism (`backdrop-filter: blur(28px) saturate(190%)`), borderless translucent cards, subtle neutral elevation shadows, and zero harsh outlines.
- **Minimalist Text Hygiene**: Strict sentence-case capitalization across all headings, controls, buttons, and labels. No ALL-CAPS allowed.
- **No Decorative Icons in Search Fields**: Pure, uncluttered inputs with crisp left-aligned hint text.
- **Dense, Compact Hierarchy**: Global line-height locked to `1.25` and font sizes unified around a 11px–13px baseline for maximum data density without visual clutter.

---

## 2. Color System & Mode Harmony

The design system enforces 100% color harmony based on the active media mode:

### Media Mode Accents
- **Cinema Mode**: All primary fills, active segmented toggles, active sort pills, headers, and star rating accents render in **CMYK Deep Red** (`#E31837`).
- **Series Mode**: All primary fills, active segmented toggles, active sort pills, headers, and icons render in **CMYK Blue** (`#0072C6`).

### Elevation & Shadow Rules
- **Neutral macOS Shadows**: All colored neon glow shadows (red/blue ambient glows) are replaced with clean, neutral elevation shadows (`0 1px 3px rgba(0, 0, 0, 0.12)`).
- **OTT Provider Chips**: Fills set to a crisp translucent gray (`rgba(0, 0, 0, 0.09)` default, `rgba(0, 0, 0, 0.15)` hover) for optimum legibility against frosted card backdrops.

---

## 3. Typography System

| Element | Font Size | Weight | Case / Style | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Window Title** | `24px` | 800 | Sentence Case | Left-aligned in `.mac-header` |
| **Modal / Section Headers** | `13px` | 700 | Sentence Case | Left-aligned, no excessive bottom margin |
| **Form Labels & General UI** | `12px` | 600 / 700 | Sentence Case | Unified across inputs, select dropdowns, and cards |
| **Badge Chips & Help Text** | `11px` | 500 | Sentence Case | Subtle, muted secondary information |
| **Input Hint Text** | `12px` | 400 | Left-aligned | Crisp placeholder styling |

---

## 4. Component Architecture

### Segmented Controls (Switchers)
- **Shared Proportions**: Standardized padding (`4px 8px`) and height across all switchers (Cinema/Series main switcher, Sort By selector, Settings API/OTT tabs).
- **Lucide SVG Targeting**: Icons strictly locked to **`12px × 12px`** (`.segmented-option svg { width: 12px !important; height: 12px !important; }`).

### macOS Traffic-Light Close Control
- **Default State**: Translucent frosted `26px` circle (`background: rgba(255, 255, 255, 0.85)`, `box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12)`).
- **Hover State**: Transforms into a native macOS **Traffic-Light Red Close Button** (`#ff5f56`) with a crisp white `x`.

### Sort Selector Toolbar
- **Container Fill**: Outer `glass-card` background fill removed (`background: transparent`, `border: none`).
- **Floating Controls**: Floating "Sort by:" label paired with native segmented options.

### Shimmer Loading Placeholders
- **Light Theme Compatibility**: Soft macOS light-gray pulse cards (`background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)`) replacing dark black blocks.
- **Grid Alignment**: Column width (`165px`), gap (`1.25rem`), card height (`280px`), and border radius (`var(--radius-lg)`) matched 1-to-1 with actual movie cards.

---

## 5. Structural Layout & Alignment Guidelines

1. **Pixel-Perfect Side Padding (`16px`)**:
   - `.mac-header`, `.results-toolbar`, and `.app-main` all enforce `padding: 0 16px !important`.
   - The top header Power button, the Sort selector container, and the rightmost movie card in the grid align to the exact same vertical right boundary line.
2. **Top Edge Alignment**:
   - Full-width `.results-toolbar` positioned directly above `.app-main`. Both the **Search Criteria** sidebar card (Column 1) and the **Movie Cards** grid (Column 2) start at `y=0`.
3. **Modal Section Whitespace Compression**:
   - Vertical gaps and top padding between detail modal sections ("Popularity Score / Total Vote Count", "Where to Stream", and "Rent / Buy") set to `0.4rem`–`0.6rem` to prevent wasted whitespace.
