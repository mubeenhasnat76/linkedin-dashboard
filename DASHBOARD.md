# LinkedIn AI Dashboard

## Overview

Professional SaaS dashboard for an AI-powered LinkedIn content automation platform. Built with HTML, Tailwind CSS, and vanilla JavaScript. Integrates with Supabase (data persistence) and n8n (AI content generation workflow).

---

## Features

### Dashboard Page
- **4 KPI Cards**: Total Posts, Engagement Rate, Trends Analyzed, Next Scheduled — with animated count-up on load
- **Generate Area**: Search input + "Generate" button that calls the n8n webhook
- **Recent Activity Table**: Lists latest posts with status badges and relative timestamps

### History Page
- Full post history table with search, topic tags, status badges, and all published timestamps

### Settings Page
- Default topic configuration (boolean search syntax)
- Posts-per-day segmented control (1/2/3 per day)
- Save to Supabase with loading state
- Reset Defaults (danger zone)

### Theme Toggle
- Dark/Light mode toggle button in the top bar
- Persisted to `localStorage` under key `linkedin-dashboard-theme`
- Respects system `prefers-color-scheme` on first visit
- Smooth transitions via CSS custom properties

### Behavior
- Shimmer skeleton loading states during initial data fetch
- Pending rows appear instantly when generating, transition to Published/Failed
- Toast notifications for success, error, and info events
- 30-second auto-refresh of activity from Supabase
- Enter key submits on the search input

---

## Architecture

```
app.html           — Single-file dashboard (HTML + CSS + JS)
DASHBOARD.md       — This file
```

### Dependencies (CDN)
- Tailwind CSS 3.x
- Supabase JS SDK v2
- Google Fonts: Inter (400, 500, 600, 700, 800)

### External Services
| Service | Purpose |
|---|---|
| **Supabase** | Stores settings (`settings` table) and post history (`posts_history` table) |
| **n8n** | Webhook at `N8N_WEBHOOK_URL` triggers AI content generation and LinkedIn publishing |

---

## Theme System

Uses CSS custom properties defined under `:root` (light) and `html.dark` (dark). All component styles reference these variables for seamless theme switching.

```css
:root {
  --bg-body: #f4f4f6;
  --bg-card: #ffffff;
  --border-color: #e2e2e6;
  --text-primary: #18181b;
  /* ... */
}
html.dark {
  --bg-body: #07070a;
  --bg-card: #0c0c0f;
  --border-color: #1c1c22;
  --text-primary: #e1e1e3;
  /* ... */
}
```

The toggle is a pill-shaped button in the top bar, styled with a gradient background and sliding thumb indicator.

---

## n8n Webhook Integration

**Endpoint**: `POST N8N_WEBHOOK_URL`

**Request Payload**:
```json
{
  "topic": "\"Artificial Intelligence\" OR \"DevOps\"",
  "posts_per_day": 2,
  "timestamp": "2026-07-07T12:00:00.000Z"
}
```

**Response Handling**:
- `200 OK` with `post_text` → success toast, published row added to table
- Non-200 response → error toast with server message
- Network error → error toast, failed row added to activity

---

## Supabase Schema

### `settings` table
| Column | Type | Description |
|---|---|---|
| `id` | int8 (PK) | Config row ID (always 1) |
| `topic` | text | Default search topic |
| `posts_per_day` | int4 | Posts to generate daily |
| `created_at` | timestamptz | Auto-generated |
| `updated_at` | timestamptz | Auto-generated |

### `posts_history` table
| Column | Type | Description |
|---|---|---|
| `id` | int8 (PK) | Auto-increment |
| `post_text` | text | Generated post content |
| `topic_used` | text | Topic used for generation |
| `published_at` | timestamptz | When published |
| `created_at` | timestamptz | Auto-generated |

---

## Visual Enhancements

- **Glassmorphism**: Semi-transparent card backgrounds with `backdrop-filter: blur(8px)`
- **Background Pattern**: Subtle radial dot grid (1px dots) overlay on body
- **Hover Effects**: Stat cards lift by 2px with gradient overlay and shadow increase
- **Gradient Accents**: Indigo-to-purple gradient on buttons, animated glow line under generate area
- **Animated KPIs**: Count-up number animation on initial load
- **Custom Scrollbar**: Thin, theme-aware scrollbar
- **Reduced Motion**: Respects `prefers-reduced-motion` by disabling all animations
- **Responsive**: Sidebar collapses to bottom nav on mobile (≤768px)

---

## Changelog

### 2026-07-07
- Initial dashboard rewrite with sidebar navigation (Dashboard / History / Settings)
- Dark/light theme toggle with localStorage persistence
- 4 KPI stat cards with animated counters
- Generate area with n8n webhook integration
- Activity stream table with Published / Pending / Failed badges
- Full post history page
- Settings page with Supabase persistence
- Glassmorphism cards, dot-pattern background, hover animations
- Shimmer skeleton loaders and toast notifications
- Mobile-responsive layout with bottom nav
- `prefers-reduced-motion` support
