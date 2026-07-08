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
