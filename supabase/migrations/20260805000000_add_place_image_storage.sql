-- Store imported photos in Supabase Storage so the image API can serve
-- a CDN redirect instead of calling Google Places on every request.

alter table public.places
  add column if not exists image_storage_path text,
  add column if not exists image_source text,
  add column if not exists image_synced_at timestamptz;

-- Public bucket for place photos (read-only for anon via public URL)
insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do nothing;
