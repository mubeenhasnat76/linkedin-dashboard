# Codebase Understanding

_Last updated: July 17, 2026_

## Project Overview

**LinkedIn AI Dashboard** — A single-page HTML dashboard that automates LinkedIn content generation using AI. Users enter a topic, trigger an n8n webhook, and the workflow fetches RSS news → LLM generates a post → publishes to LinkedIn → stores results in Supabase.

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Vanilla HTML + CSS + JS (no framework) |
| Styling     | Tailwind CSS (CDN), Inter font      |
| Backend     | Supabase (Postgres + REST API)      |
| Automation  | n8n cloud webhook (n8n workflow)    |
| Hosting     | Static file (Vercel-compatible)     |

## Architecture

```
User (Browser)
    │
    ├──► auth.html ──► js/config.js ──► js/auth.js
    │       │              │
    │       │         supabase.auth.signUp / signInWithPassword
    │       │         (multi-tenant via user_metadata.organization_name)
    │       │
    │       └──► on success → redirect to index.html
    │
    ├──► index.html ──► js/guard.js (auth guard)
    │       │              │
    │       │         supabase.auth.getSession()
    │       │         if no session → redirect to auth.html
    │       │         if session OK → load dashboard
    │       │
    │       ├──► Supabase (settings, posts_history, scheduled_posts, trending_news, dashboard_logs)
    │       │       ◄── reads/writes via supabase-js CDN
    │       │
    │       └──► n8n Webhook (POST /webhook/trigger-linkedin-v3)
    │               ── triggers: RSS fetch → LLM → LinkedIn publish → DB insert
    │
    └──► Sign Out (sidebar) → window.authGuard.signOut() → auth.html
```

## Files

| File          | Description                                              |
|---------------|----------------------------------------------------------|
| `index.html`  | Main dashboard — HTML, CSS, and JS (~1770 lines)         |
| `auth.html`   | Sign-In / Sign-Up page with glassmorphism design          |
| `js/config.js`| Shared Supabase client initialization                     |
| `js/auth.js`  | Auth operations — signUp (with org metadata) + signIn    |
| `js/guard.js` | Route guard for index.html — session check, signOut, RBAC helpers |
| `js/linkedin-oauth.js` | Client-side LinkedIn OAuth 2.0 flow — state generation, callback handling, token exchange via n8n |
| `LOGS.md`     | This file — architecture, features, table schemas, changelog |

## Key Features

1. **Dashboard** — KPI cards (total posts, engagement, trends, next scheduled), trending news feed, recent activity table, dual generate buttons
2. **History** — Full post history table from `posts_history` table
3. **Schedule** — Schedule posts with topic + datetime; cancel pending; status tracking (pending → processing → done/failed)
4. **Settings** — Default topic + posts-per-day (1-3), saved to Supabase `settings` table
5. **Dark/Light theme** — Persisted in localStorage, respects `prefers-color-scheme`
6. **Auto-refresh** — Polls Supabase every 30s for new posts; trending news refreshes hourly
7. **Trending News** — Fetches from `trending_news` table (last 24h); tracks read state in localStorage; hover effects with purple glow
8. **Logging** — `dashboard_logs` table with RLS enabled; levels: info/success/warn/error

## Latest Upgrades (July 17, 2026)

### 6. Multi-Tenant Auth System
- New `auth.html` — glassmorphism Sign-In/Sign-Up page with tab switcher, dark/light theme support via CSS variables, toast notifications
- `js/config.js` — shared Supabase client with `persistSession: true`
- `js/auth.js` — signUp stores `full_name` and `organization_name` in `user_metadata` for multi-tenant RBAC; signIn redirects to `index.html`
- `js/guard.js` — protects `index.html` via `supabase.auth.getSession()`; redirects to `auth.html` if no session; exposes `window.authGuard` with `signOut()`, `getUser()`, `getUserOrganization()`, `getUserRole()`

### 7. Sidebar Sign Out Button
- Logout button added between nav links and "System Online" status in sidebar
- Uses `.sidebar-link.signout` class with neutral gray default → soft red (`#f87171`) hover
- Calls `window.authGuard.signOut()` with fallback redirect to `auth.html`

### 8. Auth Page Theme Toggle
- Floating glassmorphism round button (fixed, top-right) on `auth.html`
- Reads/writes `linkedin-dashboard-theme` localStorage key (shared with dashboard)
- Sun/Moon icon swap; toggles `.dark` class on `<html>`
- Light-mode CSS variables added to `:root` with `html.dark` overrides for full bidirectional theme support

### 9. LinkedIn OAuth 2.0 Integration
- `js/linkedin-oauth.js` — complete client-side OAuth flow:
  - `startLinkedInAuth()` generates a cryptographically random `state` via `crypto.getRandomValues()`, stores in `sessionStorage` for CSRF protection, then redirects to `https://www.linkedin.com/oauth/v2/authorization` with `response_type=code`, `client_id`, `redirect_uri`, `state`, and `scope=openid profile w_member_social email`
  - `handleOAuthCallback()` runs on `DOMContentLoaded`, parses `?code=` and `&state=` from URL, validates state against `sessionStorage`, cleans URL via `history.replaceState()`, then POSTs the code to n8n webhook for server-side token exchange
- Settings page now has a **LinkedIn Connection** card with status badge (Connected/Not Connected) and "Connect Profile" button
- Connection status persisted in `localStorage` key `linkedin_profile_connected`
- Config added to `APP_CONFIG.linkedinOAuth` and `APP_CONFIG.linkedinTokenWebhook` in `js/config.js`
- Script loaded in `<head>` after `config.js`, before `guard.js`

## Latest Upgrades (July 16, 2026)

### 4. Master Scheduler Toggle
- New `system_settings` table with `is_scheduler_active` boolean (default true)
- Toggle switch next to "Scheduled & Past" header with green/gray states
- `loadSchedulerToggle()` fetches state on page load + auto-refresh
- `toggleSchedulerHandler()` updates DB with optimistic UI + error revert
- n8n workflow should check `system_settings.id = 1` before processing scheduled posts

### 5. Dynamic Polling Interval Dropdown
- New `poll_interval_minutes` column in `system_settings` (default 5)
- Dropdown next to toggle with 4 options (5/15/30/60 min)
- Visible only when scheduler is ON; fades out when paused
- Helper text under datetime input updates dynamically (e.g. "Fires within ~15 min...")
- `schedIntervalChangeHandler()` saves instantly to Supabase on change

## Latest Upgrades (July 14, 2026)

### 1. Dual Generate Buttons
- **Generate Text Post** (`btn-generate-text`) — indigo gradient, triggers n8n with `generate_image: false`
- **Generate Post with Image** (`btn-generate-image`) — purple/pink gradient, triggers n8n with `generate_image: true`
- Both buttons are disabled and grayed out when the topic input is empty
- Loading text dynamically changes (e.g. "Generating Post & Image...")
- Separate `isGeneratingText` / `isGeneratingImage` state flags prevent double-clicks

### 2. LinkedIn Post Preview
- Hidden `#postPreview` container with real LinkedIn card styling (avatar, name, headline, globe icon, timestamp)
- Shows the generated post text after successful generation via `showPostPreview(data, topic)`
- When `generate_image: true` and response includes `image_url`, shows a skeleton loader while the image loads, then displays the image
- Social action bar (Like, Comment, Share) with zero counts for realism
- Animated entrance with `animate-fadeInUp`

### 3. Micro-Interactions & Styling
- News cards now use `hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]` with `duration-300`
- Generate buttons auto-disable when topic input is empty (opacity 0.4)
- Disabled state overrides button gradients to muted colors

### n8n Payload Change
```
{ topic, posts_per_day, timestamp, generate_image: true|false }
```
- Backend should return `image_url` (or `image`) in JSON response when image generation is requested

## Supabase Tables

- **`profiles`** — `id` (PK → auth.users), `email`, `full_name`, `organization_name`, `avatar_url`, `created_at`, `updated_at`, `linkedin_connected`, `linkedin_token_expires_at`, `linkedin_profile_id`, `linkedin_name`
- **`settings`** — `id`, `topic`, `posts_per_day`
- **`posts_history`** — `id`, `post_text`, `topic_used`, `published_at`, `status`
- **`scheduled_posts`** — `id`, `topic`, `scheduled_for`, `status`, `created_at`, `fired_at`
- **`trending_news`** — `id`, `title`, `description`, `source`, `link`, `published_at`
- **`system_settings`** — `id`, `is_scheduler_active`, `poll_interval_minutes`
- **`dashboard_logs`** — `id`, `level`, `action`, `message`, `details`, `created_at`

### Auth Trigger

```sql
-- Auto-creates a profile row when a user signs up.
-- Extracts full_name and organization_name from raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organization_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'organization_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## n8n Webhook

- **URL**: `https://technologyjunction.app.n8n.cloud/webhook/trigger-linkedin-v3`
- **Payload**: `{ topic, posts_per_day, timestamp }`
- **Response**: `{ success, post_text, topic_used, linkedin_post_id, published_at }`
- **Timeout**: 90 seconds (AbortController)

## Notes

- No build step — pure CDN dependencies (Tailwind, Supabase JS)
- Theme toggle uses inline SVGs swapped via JS; shared `linkedin-dashboard-theme` localStorage key across auth and dashboard pages
- Auth guard (`js/guard.js`) runs on DOMContentLoaded before dashboard initializes
- Scheduled posts run via n8n every 10 min (server-side polling)
- Demo mode activates if Supabase key is placeholder
- Users table should have `raw_user_meta_data` containing `full_name`, `organization_name`, and optionally `role` for RBAC
- Supabase RLS policies should filter by `organization_name` from `auth.jwt()` for multi-tenant isolation
- LinkedIn OAuth redirects to `index.html?code=...&state=...`; the `linkedin-oauth.js` script captures and exchanges the code via n8n
- A `profiles` table (or column in `settings`) should store the LinkedIn access_token, refresh_token, and token_expiry per user
- n8n webhook `/webhook/linkedin-exchange-token` receives `{ code, redirect_uri, user_id }` and should exchange the code for tokens using LinkedIn's `/access_token` endpoint, then store them in Supabase

# Dashboard Logs

All dashboard operations are logged in real time to the `dashboard_logs` table in Supabase and displayed in the **Logs** page of the dashboard.

## Log Format

Each log entry contains:

| Field       | Description                                      |
|-------------|--------------------------------------------------|
| `level`     | `info`, `success`, `warn`, or `error`            |
| `action`    | Short action identifier (e.g. `generate_start`)  |
| `message`   | Human-readable description of the event          |
| `details`   | Optional JSON string with extra context          |
| `created_at`| ISO 8601 timestamp                               |

## Logged Operations

| Action                 | Level     | Trigger                     |
|------------------------|-----------|-----------------------------|
| `boot`                 | info      | Dashboard initialises       |
| `settings_load`        | info/err  | Loading settings from DB    |
| `settings_save`        | succ/err  | Saving settings             |
| `history_load`         | info/err  | Loading post history        |
| `generate_start`       | info      | User clicks Generate        |
| `generate_complete`    | success   | n8n workflow succeeds       |
| `generate_error`       | error     | n8n workflow fails/timeout  |
| `scheduled_load`       | info/err  | Loading scheduled posts     |
| `schedule_create`      | succ/err  | New post scheduled          |
| `schedule_cancel`      | info/err  | Scheduled post cancelled    |
| `trending_news_load`   | info/err  | Loading trending news       |

## Supabase Table Schema

```sql
-- system_settings — master scheduler toggle + polling interval
CREATE TABLE system_settings (
  id BIGINT PRIMARY KEY DEFAULT 1,
  is_scheduler_active BOOLEAN NOT NULL DEFAULT true,
  poll_interval_minutes INT NOT NULL DEFAULT 5,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO system_settings (id, is_scheduler_active, poll_interval_minutes) VALUES (1, true, 5)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can read system_settings"
  ON system_settings FOR SELECT TO anon USING (true);

CREATE POLICY "anon can update system_settings"
  ON system_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- dashboard_logs — operation audit trail
CREATE TABLE dashboard_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  action TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and allow anon inserts
ALTER TABLE dashboard_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can insert logs"
  ON dashboard_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon can read logs"
  ON dashboard_logs FOR SELECT
  TO anon
  USING (true);
```

## Viewing Logs

Logs are available in the dashboard under the **Logs** sidebar tab. The page shows the 50 most recent entries in descending order. Entries are also written directly to the Supabase `dashboard_logs` table for persistence.
