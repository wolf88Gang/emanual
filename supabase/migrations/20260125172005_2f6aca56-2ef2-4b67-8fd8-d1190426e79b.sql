-- Add constraint: tasks MUST have zone_id OR asset_id (no free-floating tasks)
-- This enforces DELMM principle: "Tasks are derived from assets and zones, not free-floating"
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_must_have_spatial_context 
CHECK (zone_id IS NOT NULL OR asset_id IS NOT NULL);

-- Comment for documentation
COMMENT ON CONSTRAINT tasks_must_have_spatial_context ON public.tasks IS 'DELMM enforcement: Tasks must derive from zones or assets, never free-floating';