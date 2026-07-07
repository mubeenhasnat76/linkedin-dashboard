# Changelog – LinkedIn Dashboard

## [v2.3] – 2026-07-06

### Changed – Hardcoded N8N webhook URL
- `N8N_WEBHOOK_URL` is now set to `https://techjunction.app.n8n.cloud/webhook-test/trigger-linkedin-post` — the "Trigger Instant Post Now" button works immediately without requiring the user to paste a URL.

### Changed – Silent settings fallback
- If `loadDashboardData()` fails to fetch from the `settings` table, it no longer shows an error toast. Instead it silently sets **Topic: "Default Topic"** and **Posts Per Day: 1**, then reveals the config UI so the dashboard is usable immediately.

## [v2.2] – 2026-07-06

### Fixed – Initialization Freeze (Supabase CDN race condition)
- **Deferred client creation**: Moved `supabase.createClient()` out of the top-level synchronous execution and into a `DOMContentLoaded` event listener, guaranteeing the Supabase CDN script has fully loaded before the client is instantiated.
- **Safe initialisation pattern**:
  ```js
  document.addEventListener('DOMContentLoaded', async () => {
    const supabaseLib = window.supabase;
    if (!supabaseLib) throw new Error('Supabase CDN script not loaded yet');
    supabase = supabaseLib.createClient(supabaseUrl, supabaseKey);
    // ... safe to call loadDashboardData() ...
  });
  ```
- **Error recovery in catch**: If any step in the initialisation chain throws (CDN missing, network error, query failure), the catch block now explicitly calls `revealConfig()` and `revealHistory([])` to force the skeletons hidden, then clears the fallback timer and marks `dataLoaded = true` so the UI is never stuck on "Loading...".
- **Variable naming**: Changed to `supabaseUrl`, `supabaseKey`, and `let supabase;` (mutable) as requested, with `N8N_WEBHOOK_URL` remaining as a top-level constant.

## [v3.0] – 2026-07-06

### Added – Instant Execution Command (Card 2)
- Prominent "Trigger Instant Post Now" button with purple gradient and glow.
- Loading state with spinner and message: "AI is generating and posting to LinkedIn... Please wait..."
- `triggerN8nWorkflow()` sends `POST` to `N8N_WEBHOOK_URL`, shows success toast on completion, and auto-refreshes the Activity Stream.
- Webhook URL is configurable via the `N8N_WEBHOOK_URL` variable at the top of the script.

### Added – Three-Card Dashboard Layout
- **Card 1**: Topic & Schedule — text input for trending topic, segmented button group for posts-per-day (1/2/3).
- **Card 2**: Manual Trigger — n8n webhook execution with full loading/success/error feedback.
- **Card 3**: Activity Stream — timeline of latest 3 posts with badge, formatted date, and relative timestamp.

### Changed – UI Polish
- Purged textarea in favour of single-line `<input>` for topic.
- Switched indigo accent to purple/pink gradient for a bolder brand look.
- Renamed heading labels to "LinkedIn Control Panel", "Topic & Schedule", "Manual Trigger", "Activity Stream".

### Changed – Script Architecture
- Renamed main load function to `loadDashboardData()`.
- Exposed `N8N_WEBHOOK_URL` as a top-level configuration variable.
- Console prefix updated from `[Dashboard]` to `[Panel]`.

## [v2.1] – 2026-07-06

### Fixed – Single Global Supabase Instance
- **GoTrueClient warning eliminated**: Removed the `supabaseClient()` factory function that created a new client on every call. The client is now initialised **once** at the top of the script with:
  ```js
  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { ... });
  ```
- All four call sites (`loadDashboardData`, `updateSettings`, `triggerN8nWorkflow`, auto-refresh interval) reference the same global `supabase` instance directly.

### Fixed – Supabase URL Spelling
- Corrected project URL from `sjjybpdykwvgqfyqliod` to `sjjybpydkwvgqfyqliod`.

### Changed – Webhook Configuration
- `N8N_WEBHOOK_URL` now defaults to an empty string with a clear comment placeholder:
  ```js
  const N8N_WEBHOOK_URL = ''; // I will paste my n8n webhook test URL here
  ```
- The trigger function checks `if (!N8N_WEBHOOK_URL)` and shows a helpful toast prompting the user to configure it.

## [v2.0] – 2026-07-06

### Fixed – Skeleton Loader Freeze (Root Cause)
- **Safe client init**: Changed `supabase.createClient()` to use optional chaining:  
  `window.supabase?.createClient(...)`. If the Supabase CDN fails to load, the script no longer throws a `TypeError` at the top level, which previously killed all JS execution and left skeletons visible permanently.
- **Guards added**: Every query now checks `if (!supabase)` before proceeding, emitting a clear console error if the SDK is unavailable.

### Added – 3-Second Timeout Fallback
- A `setTimeout` of 3000ms starts on page load. If `loadDashboardData()` has not resolved by then, skeletons are force-hidden and empty/editable UI is revealed with an error toast.
- The timer is cancelled via `clearTimeout()` once data loads successfully.

### Added – Console Error Logging (F12 Debugging)
- Every `catch` block now writes structured logs to the browser console with a `[Dashboard]` prefix:
  - `[Dashboard] Failed to load settings table: <error object>`
  - `[Dashboard] Failed to load posts_history table: <error object>`
  - `[Dashboard] Failed to update settings table: <error object>`
  - `[Dashboard] Auto-refresh failed: <error object>`
  - `[Dashboard] supabase-js client not available – CDN may have failed.`

### Changed – Query Structure & Error Handling
- Config query now uses `supabase.from('settings').select('topic, posts_per_day').eq('id', 1).single()` — matching the user's exact specification.
- Config and history fetches are now isolated (`loadDashboardData()` runs them sequentially instead of `Promise.all()`), so a failure in one does not block the other from displaying.
- Removed `throw err` re-throws from fetch catch blocks (previously re-thrown errors were silently swallowed by `refreshAll()`'s empty catch, making the pattern pointless and confusing).

### Removed
- Dead `detectChanges()` function that contained a tautology (`currentPostsPerDay !== currentPostsPerDay`) and was never called.
- `refreshAll()` wrapper function (no longer needed after separating config/history fetching).

### Changed – Event Wiring
- `wireEvents()` is called synchronously *before* `loadDashboardData()`, so the topic input and posts-per-day toggle are interactive immediately, even during the loading phase.

### Credentials
- Switched from `service_role` key to `anon` public key for client-side safety.
