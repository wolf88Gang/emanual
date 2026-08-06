-- ============ plant_placements ============
CREATE TABLE public.plant_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  placement_slot_id uuid NOT NULL DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  pot_asset_id uuid NULL REFERENCES public.assets(id) ON DELETE SET NULL,
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE RESTRICT,
  zone_id uuid NULL REFERENCES public.zones(id) ON DELETE SET NULL,
  contract_id uuid NULL REFERENCES public.rental_contracts(id) ON DELETE SET NULL,
  spot_label text NULL,
  spot_notes text NULL,
  access_notes text NULL,
  reference_photo_path text NULL,
  status text NOT NULL,
  reserved_from timestamptz NOT NULL,
  reserved_until timestamptz NULL,
  installed_at timestamptz NULL,
  collected_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  condition_at_collection smallint NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plant_placements_status_chk CHECK (status IN ('reserved','installed','collected','cancelled')),
  CONSTRAINT plant_placements_range_chk CHECK (reserved_until IS NULL OR reserved_until > reserved_from),
  CONSTRAINT plant_placements_pot_distinct_chk CHECK (pot_asset_id IS NULL OR pot_asset_id <> asset_id),
  CONSTRAINT plant_placements_condition_chk CHECK (condition_at_collection IS NULL OR condition_at_collection BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX uniq_placement_installed_asset
  ON public.plant_placements(asset_id)
  WHERE status = 'installed' AND collected_at IS NULL;

CREATE UNIQUE INDEX uniq_placement_installed_pot
  ON public.plant_placements(pot_asset_id)
  WHERE pot_asset_id IS NOT NULL AND status = 'installed' AND collected_at IS NULL;

ALTER TABLE public.plant_placements
  ADD CONSTRAINT plant_placements_asset_no_overlap
  EXCLUDE USING gist (
    asset_id WITH =,
    tstzrange(reserved_from, COALESCE(collected_at, reserved_until, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (status IN ('reserved','installed'));

ALTER TABLE public.plant_placements
  ADD CONSTRAINT plant_placements_pot_no_overlap
  EXCLUDE USING gist (
    pot_asset_id WITH =,
    tstzrange(reserved_from, COALESCE(collected_at, reserved_until, 'infinity'::timestamptz), '[)') WITH &&
  ) WHERE (pot_asset_id IS NOT NULL AND status IN ('reserved','installed'));

CREATE INDEX idx_placements_slot ON public.plant_placements(placement_slot_id);
CREATE INDEX idx_placements_estate_status ON public.plant_placements(estate_id, status);
CREATE INDEX idx_placements_contract ON public.plant_placements(contract_id);
CREATE INDEX idx_placements_asset_status ON public.plant_placements(asset_id, status);

-- coherence trigger
CREATE OR REPLACE FUNCTION public.validate_plant_placement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.reserved_until IS NOT NULL AND NEW.reserved_until <= NEW.reserved_from THEN
    RAISE EXCEPTION 'reserved_until must be greater than reserved_from';
  END IF;

  IF NEW.status = 'reserved' AND (NEW.installed_at IS NOT NULL OR NEW.collected_at IS NOT NULL OR NEW.cancelled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'reserved placement cannot have installed/collected/cancelled timestamps';
  END IF;

  IF NEW.status = 'installed' AND (NEW.installed_at IS NULL OR NEW.collected_at IS NOT NULL OR NEW.cancelled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'installed placement requires installed_at and no collected/cancelled timestamps';
  END IF;

  IF NEW.status = 'collected' AND (NEW.installed_at IS NULL OR NEW.collected_at IS NULL) THEN
    RAISE EXCEPTION 'collected placement requires installed_at and collected_at';
  END IF;

  IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
    RAISE EXCEPTION 'cancelled placement requires cancelled_at';
  END IF;

  IF NEW.collected_at IS NOT NULL AND NEW.installed_at IS NOT NULL AND NEW.collected_at < NEW.installed_at THEN
    RAISE EXCEPTION 'collected_at cannot precede installed_at';
  END IF;

  IF NEW.installed_at IS NOT NULL AND NEW.installed_at < NEW.reserved_from THEN
    RAISE EXCEPTION 'installed_at cannot precede reserved_from';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_plant_placement
BEFORE INSERT OR UPDATE ON public.plant_placements
FOR EACH ROW EXECUTE FUNCTION public.validate_plant_placement();

CREATE TRIGGER update_plant_placements_updated_at
BEFORE UPDATE ON public.plant_placements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Only SELECT for authenticated; all mutations go through RPCs (service_role/definer)
GRANT SELECT ON public.plant_placements TO authenticated;
GRANT ALL ON public.plant_placements TO service_role;

ALTER TABLE public.plant_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plant_placements_select_internal"
ON public.plant_placements FOR SELECT TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'crew')
  )
);

-- ============ tasks additive columns ============
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS plantops_kind text NULL,
  ADD COLUMN IF NOT EXISTS placement_id uuid NULL REFERENCES public.plant_placements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replacement_asset_id uuid NULL REFERENCES public.assets(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_plantops_kind_chk CHECK (plantops_kind IS NULL OR plantops_kind IN ('maintenance','incident'));

CREATE INDEX IF NOT EXISTS idx_tasks_placement ON public.tasks(placement_id);