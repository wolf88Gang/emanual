-- ============================================
-- INVENTORY MANAGEMENT SYSTEM
-- ============================================

-- Inventory categories enum
CREATE TYPE public.inventory_category AS ENUM (
  'hand_tool',
  'equipment', 
  'supply',
  'material'
);

-- Inventory condition enum
CREATE TYPE public.inventory_condition AS ENUM (
  'new',
  'good',
  'fair',
  'needs_repair',
  'out_of_service'
);

-- Main inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_es TEXT,
  category inventory_category NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'unit',
  condition inventory_condition DEFAULT 'good',
  purchase_date DATE,
  serial_number TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tool assignments to workers
CREATE TABLE public.tool_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  quantity_assigned INTEGER NOT NULL DEFAULT 1,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_return_at TIMESTAMP WITH TIME ZONE,
  returned_at TIMESTAMP WITH TIME ZONE,
  return_condition inventory_condition,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- WORKER CHECK-IN WITH PHOTO + GPS
-- ============================================

-- Worker shifts table
CREATE TABLE public.worker_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_photo_url TEXT,
  check_out_at TIMESTAMP WITH TIME ZONE,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  check_out_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_shifts ENABLE ROW LEVEL SECURITY;

-- Inventory Items Policies
CREATE POLICY "Users can view inventory in their estates"
ON public.inventory_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM estates e 
  WHERE e.id = inventory_items.estate_id 
  AND e.org_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Owners/Managers can manage inventory"
ON public.inventory_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = inventory_items.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Tool Assignments Policies
CREATE POLICY "Users can view tool assignments in their estates"
ON public.tool_assignments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM estates e 
  WHERE e.id = tool_assignments.estate_id 
  AND e.org_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Owners/Managers can manage tool assignments"
ON public.tool_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = tool_assignments.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Workers can update their own assignments"
ON public.tool_assignments FOR UPDATE
USING (assigned_to_user_id = auth.uid());

-- Worker Shifts Policies
CREATE POLICY "Users can view shifts in their estates"
ON public.worker_shifts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM estates e 
  WHERE e.id = worker_shifts.estate_id 
  AND e.org_id = get_user_org_id(auth.uid())
));

CREATE POLICY "Workers can create their own shifts"
ON public.worker_shifts FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = worker_shifts.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Workers can update their own shifts"
ON public.worker_shifts FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Owners/Managers can manage all shifts"
ON public.worker_shifts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = worker_shifts.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================

CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_worker_shifts_updated_at
BEFORE UPDATE ON public.worker_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();