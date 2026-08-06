CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.estates
  ADD COLUMN IF NOT EXISTS client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estates_client_id ON public.estates(client_id);

ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS floor_label text NULL;