# Supabase Migration Template

Use this file as the copy-paste template when you add new database changes.

## Where to create the real migration

Create the real SQL file under:

`supabase/migrations/`

Good file name examples:

- `create_example_table.sql`
- `add_status_to_sessions.sql`
- `fix_example_table_rls.sql`
- `seed_new_zealand_example_data.sql`

Do not edit old migrations that already ran on production. Create a new file for every new change.

## Project conventions

- Use `public.` schema explicitly
- Prefer `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- Prefer `DROP POLICY IF EXISTS` before recreating policies
- For seed data, prefer `ON CONFLICT DO NOTHING`
- Keep migrations idempotent when possible
- Keep table names, column names, and SQL comments in English

## 1. Create a new table

```sql
CREATE TABLE IF NOT EXISTS public.example_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.example_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on example_items" ON public.example_items;
CREATE POLICY "Allow public read access on example_items"
  ON public.example_items
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert on example_items" ON public.example_items;
CREATE POLICY "Allow public insert on example_items"
  ON public.example_items
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on example_items" ON public.example_items;
CREATE POLICY "Allow public update on example_items"
  ON public.example_items
  FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow public delete on example_items" ON public.example_items;
CREATE POLICY "Allow public delete on example_items"
  ON public.example_items
  FOR DELETE
  USING (true);
```

## 2. Add new columns to an existing table

```sql
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS review_note TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
```

## 3. Create an index

```sql
CREATE INDEX IF NOT EXISTS idx_sessions_status
  ON public.sessions (status);
```

## 4. Seed data safely

```sql
INSERT INTO public.example_items (slug, title, is_active)
VALUES
  ('item-1', 'Example Item 1', true),
  ('item-2', 'Example Item 2', true)
ON CONFLICT (slug) DO NOTHING;
```

## 5. Update existing rows

```sql
UPDATE public.global_settings
SET portal_name = 'PAK''nSAVE Customer Portal'
WHERE id = 'default';
```

## 6. Storage bucket example

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'assets');
```

## 7. New migration checklist

Before push:

1. Create a new `.sql` file in `supabase/migrations/`
2. Keep the migration focused on one job
3. Make sure the SQL can run safely on a fresh project
4. Use `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` where appropriate
5. Push to GitHub
6. Supabase GitHub integration will apply it on `main`

## Example ready-to-copy file

If you want to add a new table quickly, start from this:

```sql
CREATE TABLE IF NOT EXISTS public.your_table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
