-- Add fields to worker_shifts for QR-based check-in/out
ALTER TABLE public.worker_shifts 
ADD COLUMN IF NOT EXISTS qr_code_in TEXT,
ADD COLUMN IF NOT EXISTS qr_code_out TEXT,
ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id),
ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones(id),
ADD COLUMN IF NOT EXISTS checkin_type TEXT DEFAULT 'self' CHECK (checkin_type IN ('self', 'assisted')),
ADD COLUMN IF NOT EXISTS work_description TEXT,
ADD COLUMN IF NOT EXISTS work_description_raw TEXT[],
ADD COLUMN IF NOT EXISTS tasks_completed UUID[],
ADD COLUMN IF NOT EXISTS gps_validated BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_worker_shifts_qr_code_in ON public.worker_shifts(qr_code_in);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_asset_id ON public.worker_shifts(asset_id);
CREATE INDEX IF NOT EXISTS idx_worker_shifts_zone_id ON public.worker_shifts(zone_id);

-- Create table for work log entries (voice inputs)
CREATE TABLE IF NOT EXISTS public.work_log_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.worker_shifts(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  processed_text TEXT,
  entry_type TEXT DEFAULT 'work' CHECK (entry_type IN ('work', 'issue', 'materials', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on work_log_entries
ALTER TABLE public.work_log_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_log_entries
CREATE POLICY "Users can view work logs for their shifts"
ON public.work_log_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.worker_shifts ws
    WHERE ws.id = work_log_entries.shift_id
    AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert work logs for their shifts"
ON public.work_log_entries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.worker_shifts ws
    WHERE ws.id = work_log_entries.shift_id
    AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Managers can view all work logs"
ON public.work_log_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('owner', 'manager')
  )
);