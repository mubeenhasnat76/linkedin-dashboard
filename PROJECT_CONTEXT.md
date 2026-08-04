# LinkedIn AI Automation Platform — Project Context

## Overview

A multi-user SaaS application that automates LinkedIn content creation and publishing. Users connect their LinkedIn accounts, generate AI-powered posts (text or image), schedule them, and publish automatically via n8n Cloud workflows.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML + CSS + JavaScript (SPA, no framework) |
| Styling | Tailwind CSS (CDN), Inter font, custom CSS variables for dark/light mode |
| Auth | Supabase Auth (email/password, multi-tenant via organization_name) |
| Database | Supabase PostgreSQL with Row Level Security |
| Automation | n8n Cloud (2 workflows: Scheduled Posts Poller + LinkedIn AI Generator) |
| AI | OpenAI GPT-4.1-mini (post generation), Pollinations AI (image generation) |
| Social API | LinkedIn OAuth 2.0 + LinkedIn UGC Posts API |
| News Source | Google News RSS |
| OAuth Token Exchange | Supabase Edge Functions (Deno) |

## Infrastructure

- **n8n Instance**: `junctiontech.app.n8n.cloud` (shared instanceId across both workflows)
- **Supabase Project**: `sjjybpydkwvgqfyqliod.supabase.co`
- **Hosting**: Static files (Vercel-compatible)

---

## Frontend Files

### `index.html` (~2577 lines)
Single-page dashboard containing:
- HTML layout, all CSS (inline), and all JavaScript (inline after CDN scripts)
- Pages: Dashboard, History, Schedule, Settings
- Supabase CRUD operations (settings, posts_history, scheduled_posts, trending_news, profiles)
- n8n webhook calls for manual generation + publishing
- Scheduler UI (master toggle, interval selector, post type selector)
- Auto-refresh every 30s (polls Supabase)
- LinkedIn OAuth popup message listener
- Theme toggle (dark/light with localStorage persistence)

Key global variables:
- `currentUser` — Supabase auth user object
- `userProfile` — row from `profiles` table
- `allPosts` — array from `posts_history`
- `allScheduled` — array from `scheduled_posts`
- `isSchedulerActive` / `pollInterval` — scheduler state
- `CONFIG_ID = 1` — singleton row ID for settings

### `auth.html` (~530 lines)
Glassmorphism Sign-In / Sign-Up page:
- Tab switcher for Sign In / Sign Up
- Email verification flow (signup success card, email verified card, unverified card)
- Field validation with inline errors
- Password visibility toggles
- Resend verification email with 60s cooldown
- Redirects to `index.html` on successful sign-in

### `js/config.js`
Shared configuration:
- Supabase URL and anon key
- LinkedIn OAuth client ID, redirect URI, scopes
- Supabase Edge Function URLs (token-exchange, disconnect)
- n8n webhook URLs:
  - `N8N_LINKEDIN_GENERATE_WEBHOOK`: `https://junctiontech.app.n8n.cloud/webhook/linkedin-generate`
  - `N8N_LINKEDIN_PUBLISH_WEBHOOK`: `https://junctiontech.app.n8n.cloud/webhook/linkedin-publish`
- Initializes `window.supabase` client with `persistSession: true`

### `js/auth.js`
Auth operations:
- `handleSignUp(fullName, orgName, email, password)` — stores `full_name` and `organization_name` in `user_metadata`
- `handleSignIn(email, password)` — signs in and redirects to `index.html`
- Email verification detection via URL hash
- Field validation (full name, org name, email, password >= 6 chars)
- Auto-redirect if already logged in

### `js/guard.js`
Route guard (IIFE, runs on DOMContentLoaded):
- Checks `supabase.auth.getSession()` with retry (5 attempts, 600ms delay)
- Redirects to `auth.html` if no session
- Exposes `window.authGuard` with: `signOut()`, `getUser()`, `getUserOrganization()`, `getUserRole()`, `isAuthenticated()`, `checkAuth()`
- Listens for `SIGNED_OUT` auth state change and redirects

### `js/linkedin-oauth.js`
LinkedIn OAuth client-side flow (IIFE):
- `generateState()` — cryptographically random state via `crypto.getRandomValues()`, stored in localStorage for CSRF validation
- `startLinkedInAuth()` — opens popup window to LinkedIn authorization URL with client_id, redirect_uri, state, scopes
- `checkLinkedInConnection()` — queries profiles table for linkedin_connected, linkedin_token_expires_at, validates token expiry
- `disconnectLinkedIn()` — POSTs to Supabase Edge Function to clear LinkedIn token fields in profiles
- `promptLinkedInAuth()` — shows account selection modal before starting auth
- `updateConnectButton(state)` — updates UI button and badge based on connection state (disconnected/connecting/connected/expired)
- Handles popup message event via `postMessage`
- Exposes `window.linkedinOAuth` with: `startAuth`, `checkConnection`, `updateConnectButton`, `disconnectLinkedIn`, `promptAuth`

### `js/linkedin-callback.js`
OAuth callback handler for the popup window:
- Runs in `linkedin-callback.html`
- Parses `?code=` and `&state=` from URL
- Validates state against localStorage (CSRF protection)
- Gets Supabase session from parent window via `window.opener.supabase.auth.getSession()`
- POSTs the code + redirect_uri to Supabase Edge Function (`LINKEDIN_EDGE_FUNCTION`) for server-side token exchange
- Sends result back to parent window via `window.opener.postMessage()`

---

## Database Tables

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users ON DELETE CASCADE |
| email | TEXT | |
| full_name | TEXT | |
| organization_name | TEXT | For multi-tenant RBAC |
| avatar_url | TEXT | |
| created_at | TIMESTAMPTZ | Default now() |
| updated_at | TIMESTAMPTZ | Default now() |
| linkedin_connected | BOOLEAN | Default false |
| linkedin_access_token | TEXT | LinkedIn OAuth token |
| linkedin_token_expires_at | TIMESTAMPTZ | |
| linkedin_profile_id | TEXT | LinkedIn user sub |
| linkedin_name | TEXT | LinkedIn display name |

RLS: Users can SELECT/UPDATE/INSERT their own row (auth.uid() = id). Trigger: `handle_new_user()` auto-creates row on signup.

### `settings`
| Column | Type |
|--------|------|
| id | BIGINT (PK, default 1) |
| topic | TEXT |
| posts_per_day | INT |

### `posts_history`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | PK |
| user_id | UUID | References auth.users |
| post_text | TEXT | |
| topic_used | TEXT | |
| linkedin_post_id | TEXT | URN from LinkedIn API |
| image_url | TEXT | Media URN if image post |
| article_headline | TEXT | RSS article title |
| article_url | TEXT | RSS article link |
| published_at | TIMESTAMPTZ | |
| status | TEXT | |

### `scheduled_posts`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | PK |
| user_id | UUID | References auth.users |
| topic | TEXT | |
| post_type | TEXT | 'text' or 'image' |
| scheduled_for | TIMESTAMPTZ | When to publish |
| status | TEXT | pending → processing → done/failed |
| post_text | TEXT | Populated after generation |
| linkedin_post_id | TEXT | Populated after generation |
| generator_execution_id | TEXT | n8n execution ID from generator |
| workflow_execution_id | TEXT | n8n execution ID from poller |
| completed_at | TIMESTAMPTZ | When processing finished |
| processing_time_ms | BIGINT | Duration of processing |
| error | TEXT | Error message if failed |
| fired_at | TIMESTAMPTZ | When claim happened |
| created_at | TIMESTAMPTZ | Default now() |

### `system_settings`
| Column | Type |
|--------|------|
| id | BIGINT (PK, default 1, CHECK id=1) |
| is_scheduler_active | BOOLEAN (default true) |
| poll_interval_minutes | INT (default 5) |

RLS: anon can SELECT and UPDATE.

### `dashboard_logs`
| Column | Type |
|--------|------|
| id | BIGINT GENERATED ALWAYS AS IDENTITY PK |
| level | TEXT (info/success/warn/error) |
| action | TEXT |
| message | TEXT |
| details | TEXT (optional JSON) |
| created_at | TIMESTAMPTZ (default now()) |

RLS: anon can INSERT and SELECT.

### `trending_news`
| Column | Type |
|--------|------|
| id | BIGINT PK |
| title | TEXT |
| description | TEXT |
| source | TEXT |
| link | TEXT |
| published_at | TIMESTAMPTZ |
| created_at | TIMESTAMPTZ |

---

## n8n Workflows

### 1. LinkedIn AI Generator

**Webhook**: POST at path `linkedin-generate` (production URL auto-generated by n8n on activation)

**Flow**:
```
Webhook
  → Get User Profile (Supabase: profiles WHERE id = body.user_id)
  → LinkedIn Connected? (IF linkedin_connected == true)
      → Token Available? (IF linkedin_access_token not empty)
          → Parse Webhook Payload (Code node — normalizes topic, post_type, generate_image)
          → Fetch Settings (Manual) (Supabase: settings)
          → Select Manual Topic (Code node — merges webhook topic with settings default)
          → HTTP Request (Google News RSS search)
          → XML (parse RSS XML to JSON)
          → Edit Fields (extract RSS entries)
          → Basic LLM Chain (OpenAI GPT-4.1-mini with Structured Output Parser)
              ├── OpenAI Chat Model (model: gpt-4.1-mini)
              └── Structured Output Parser (schema: { post_text, image_prompt })
          → Get Person URN (LinkedIn /v2/userinfo API)
              → On error → Respond: Invalid Token
          → Generate Image? (IF generate_image == true)
              ├── TRUE → Register Upload (LinkedIn /v2/assets?action=registerUpload)
              │           → Generate Image (Pollinations) → Upload Image to LinkedIn
              │           → Post to LinkedIn with Image (UGC Posts API, shareMediaCategory: IMAGE)
              └── FALSE → Post to LinkedIn (UGC Posts API, shareMediaCategory: NONE)
          → Prepare History Record (Code node — assembles post_text, linkedin_post_id, image_url, etc.)
          → Save to Posts History (Supabase INSERT)
          → Respond to Webhook (returns JSON: { success, status, post_text, topic_used, image_url, published_at, linkedin_post_id })
      → Token empty → Respond: Invalid Token (401)
  → Not connected → Respond: Not Connected (400)
```

### 2. Scheduled Posts Poller

**Trigger**: Every 5 minutes (Schedule Trigger)

**Flow**:
```
Every 5 Minutes
  → Check Scheduler Settings (Supabase: system_settings WHERE id=1)
  → Is Scheduler Active? (IF is_scheduler_active == true)
      ├── TRUE → Get Due Posts (Supabase: scheduled_posts WHERE status=pending AND scheduled_for <= now(), LIMIT 5, ORDER BY scheduled_for ASC)
      │           → Has Due Posts? (IF id exists)
      │               ├── TRUE → Log Workflow Started → Loop Over Posts (SplitInBatches)
      │               │           → Validate Post (Code: check id, user_id, topic, post_type exist)
      │               │           → Log Processing
      │               │           → Is Valid? (IF __valid == true)
      │               │               ├── TRUE → Claim Post (Atomic) (Supabase UPDATE scheduled_posts SET status=processing WHERE id=X AND status=pending)
      │               │               │           → Claimed? (IF Supabase returned a row)
      │               │               │               ├── TRUE → Log Generator Started → Fire Generator Webhook (HTTP POST to trigger-linkedin-v3)
      │               │               │               │           ├── SUCCESS → Log Completed (Code: extracts post_text, linkedin_post_id from response)
      │               │               │               │           │             → Mark Done (Supabase UPDATE: status=done, post_text, linkedin_post_id, etc.)
      │               │               │               │           └── ERROR → Log Failed (Generator) → Mark Failed
      │               │               │               └── FALSE → Log Skipped (already claimed by another run)
      │               │               └── FALSE → Log Failed (Validation) → Mark Failed (Invalid)
      │               └── FALSE → Log No Pending Posts
      └── FALSE → Log Scheduler Disabled
```

---

## Key Data Flows

### Manual Post Generation
1. User enters topic, clicks Generate Text or Generate Post with Image
2. `triggerN8n(generateImage)` fires:
   - POST to `N8N_LINKEDIN_GENERATE_WEBHOOK` with `{ topic, posts_per_day, timestamp, generate_image, user_id, access_token }`
   - access_token comes from `userProfile.linkedin_access_token` (read from profiles table on dashboard load)
3. Generator workflow runs → generates AI content → publishes to LinkedIn → saves to posts_history → returns response
4. Frontend shows preview with post text and optionally image

### Scheduled Post Publishing
1. User schedules a post via `scheduleNewPost()`:
   - INSERT into `scheduled_posts` with `{ topic, scheduled_for, status: 'pending', post_type, user_id }`
2. **Poller workflow** (every 5 min):
   - Reads `system_settings` to check if scheduler is active
   - Queries `scheduled_posts` WHERE `status='pending' AND scheduled_for <= now()`
   - For each due post:
     - Atomic claim: UPDATE `status='processing'` WHERE `id=X AND status='pending'`
     - If claimed successfully:
       - POST to Generator webhook with `{ scheduled_post_id, user_id, topic, post_type, organization_id, scheduled_for, source: 'scheduler' }`
       - On success: UPDATE `scheduled_posts` with `status='done'`, `post_text`, `linkedin_post_id`, `generator_execution_id`, `workflow_execution_id`, `completed_at`, `processing_time_ms`
       - On failure: UPDATE `scheduled_posts` with `status='failed'`, `error`
3. **Generator workflow** receives the webhook:
   - Looks up user profile by `user_id`
   - Validates LinkedIn connection and token
   - Generates AI content via OpenAI
   - Publishes to LinkedIn via UGC Posts API
   - Saves to `posts_history`
   - Returns JSON response via Respond to Webhook node

### LinkedIn OAuth Connection
1. User clicks "Connect Profile" on Settings page
2. `promptLinkedInAuth()` shows modal → `startLinkedInAuth()` opens popup to LinkedIn authorization URL
3. User authorizes → LinkedIn redirects to `linkedin-callback.html` with `?code=...&state=...`
4. `linkedin-callback.js` validates state, gets session from parent window, POSTs code to Supabase Edge Function
5. Edge Function exchanges code for access token, fetches LinkedIn profile, stores in `profiles` table
6. Sends `postMessage` to parent window → parent shows success toast and refreshes connection status

---

## Current Debugging Issue

**Symptom**: Scheduled posts are marked as `status=done` but `post_text`, `linkedin_post_id`, and `generator_execution_id` remain NULL in `scheduled_posts`.

Fields that ARE set correctly: `status`, `completed_at`, `processing_time_ms`, `workflow_execution_id`.

**Known root cause analysis**:

1. **Wrong webhook URL in Poller's Fire Generator Webhook node**:
   - Poller calls: `https://technologyjunction.app.n8n.cloud/webhook/trigger-linkedin-v3`
   - Generator's webhook path is: `linkedin-generate`
   - The URL `trigger-linkedin-v3` is likely an older webhook that returns a different response format without `post_text` and `linkedin_post_id`
   - The Poller's Log Completed node reads `$input.item.json.post_text` and `$input.item.json.linkedin_post_id` from the HTTP response — if the old webhook doesn't return these fields, they will be null

2. **Generator doesn't return `generator_execution_id`**:
   - The Poller's Log Completed node looks for: `resp.execution_id ?? resp.executionId ?? resp.generator_execution_id`
   - The Generator's Respond to Webhook returns: `{ success, status, post_text, topic_used, image_url, published_at, linkedin_post_id }`
   - None of the fields `execution_id`, `executionId`, or `generator_execution_id` are in the response → always null

**What should happen**:
- Poller sends webhook to Generator with `{ scheduled_post_id, user_id, topic, post_type, ... }`
- Generator processes and returns `{ success, post_text, linkedin_post_id, ... }` via Respond to Webhook
- Poller's Log Completed node reads the response and passes data to Mark Done node
- Mark Done node updates all fields in scheduled_posts

---

## Edge Functions (Supabase)

### `linkedin-token-exchange`
- Receives POST with `{ code, redirect_uri }` and Authorization Bearer JWT
- Authenticates user via Supabase Auth
- Exchanges authorization code for access token via LinkedIn `/accessToken` endpoint
- Fetches LinkedIn profile via `/v2/userinfo`
- Stores in `profiles`: `linkedin_connected=true`, `access_token`, `expires_at`, `profile_id`, `name`
- Returns `{ success: true, connected: true }`

### `linkedin-disconnect`
- Receives POST with Authorization Bearer JWT
- Authenticates user
- Clears all LinkedIn fields in `profiles`: `linkedin_connected=false`, `access_token=null`, `expires_at=null`, `profile_id=null`, `name=null`
- Returns `{ success: true, disconnected: true }`

---

## Deployment Notes

- No build step — pure CDN dependencies
- Static hosting (Vercel, Netlify, or any static file server)
- Supabase RLS ensures multi-tenant data isolation via `organization_name`
- n8n workflows must be activated in n8n Cloud for webhooks to be live
- Both n8n workflows share the same Cloud instance (`junctiontech.app.n8n.cloud`)
- Frontend n8n webhook URLs point to the same instance (`junctiontech.app.n8n.cloud`)
