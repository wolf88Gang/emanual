
-- =============================================
-- 1. TASK TEMPLATES (Smart recurring tasks)
-- =============================================
CREATE TABLE public.task_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    asset_type text NULL,
    plant_profile_id uuid NULL REFERENCES public.plant_profiles(id),
    title text NOT NULL,
    title_es text,
    description text,
    description_es text,
    frequency text NOT NULL DEFAULT 'monthly',
    priority integer DEFAULT 2,
    required_photo boolean DEFAULT true,
    season_months integer[] DEFAULT '{}',
    is_ai_generated boolean DEFAULT false,
    enabled boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/Managers can manage task templates" ON public.task_templates
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM estates e WHERE e.id = task_templates.estate_id AND e.org_id = get_user_org_id(auth.uid()))
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Users can view task templates" ON public.task_templates
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM estates e WHERE e.id = task_templates.estate_id AND e.org_id = get_user_org_id(auth.uid()))
);

-- =============================================
-- 2. COMPOST MANAGEMENT
-- =============================================
CREATE TYPE public.compost_pile_status AS ENUM ('active', 'curing', 'ready', 'applied', 'archived');

CREATE TABLE public.compost_piles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES public.zones(id),
    name text NOT NULL,
    status public.compost_pile_status NOT NULL DEFAULT 'active',
    started_at date NOT NULL DEFAULT CURRENT_DATE,
    estimated_ready_at date,
    actual_ready_at date,
    volume_liters numeric,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compost_piles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/Managers can manage compost piles" ON public.compost_piles
FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM estates e WHERE e.id = compost_piles.estate_id AND e.org_id = get_user_org_id(auth.uid()))
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Users can view compost piles" ON public.compost_piles
FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM estates e WHERE e.id = compost_piles.estate_id AND e.org_id = get_user_org_id(auth.uid()))
);

CREATE TYPE public.compost_ingredient_type AS ENUM ('green', 'brown', 'activator', 'water', 'other');

CREATE TABLE public.compost_ingredients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pile_id uuid NOT NULL REFERENCES public.compost_piles(id) ON DELETE CASCADE,
    ingredient_type public.compost_ingredient_type NOT NULL,
    name text NOT NULL,
    quantity_kg numeric,
    added_at timestamptz NOT NULL DEFAULT now(),
    added_by uuid REFERENCES public.profiles(id),
    notes text
);

ALTER TABLE public.compost_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage compost ingredients" ON public.compost_ingredients
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM compost_piles cp
        JOIN estates e ON e.id = cp.estate_id
        WHERE cp.id = compost_ingredients.pile_id AND e.org_id = get_user_org_id(auth.uid())
    )
);

CREATE TABLE public.compost_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pile_id uuid NOT NULL REFERENCES public.compost_piles(id) ON DELETE CASCADE,
    logged_at timestamptz NOT NULL DEFAULT now(),
    logged_by uuid REFERENCES public.profiles(id),
    temperature_c numeric,
    moisture_percent numeric,
    turned boolean DEFAULT false,
    photo_url text,
    notes text
);

ALTER TABLE public.compost_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage compost logs" ON public.compost_logs
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM compost_piles cp
        JOIN estates e ON e.id = cp.estate_id
        WHERE cp.id = compost_logs.pile_id AND e.org_id = get_user_org_id(auth.uid())
    )
);

CREATE TABLE public.compost_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pile_id uuid NOT NULL REFERENCES public.compost_piles(id) ON DELETE CASCADE,
    zone_id uuid REFERENCES public.zones(id),
    asset_id uuid REFERENCES public.assets(id),
    applied_at timestamptz NOT NULL DEFAULT now(),
    applied_by uuid REFERENCES public.profiles(id),
    quantity_kg numeric,
    notes text
);

ALTER TABLE public.compost_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage compost applications" ON public.compost_applications
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM compost_piles cp
        JOIN estates e ON e.id = cp.estate_id
        WHERE cp.id = compost_applications.pile_id AND e.org_id = get_user_org_id(auth.uid())
    )
);

-- =============================================
-- 3. CRM / SALES MODULE
-- =============================================
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    notes text,
    estate_id uuid REFERENCES public.estates(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage clients" ON public.clients
FOR ALL TO authenticated
USING (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Org users can view clients" ON public.clients
FOR SELECT TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

CREATE TABLE public.product_catalog (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    name_es text,
    description text,
    category text NOT NULL DEFAULT 'service',
    unit_price numeric NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    unit text DEFAULT 'unit',
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage catalog" ON public.product_catalog
FOR ALL TO authenticated
USING (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Org users can view catalog" ON public.product_catalog
FOR SELECT TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TABLE public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    invoice_number text NOT NULL,
    status public.invoice_status NOT NULL DEFAULT 'draft',
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date,
    subtotal numeric NOT NULL DEFAULT 0,
    tax_percent numeric DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'USD',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage invoices" ON public.invoices
FOR ALL TO authenticated
USING (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Org users can view invoices" ON public.invoices
FOR SELECT TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

CREATE TABLE public.invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.product_catalog(id),
    description text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage invoice items" ON public.invoice_items
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id AND i.org_id = get_user_org_id(auth.uid())
    )
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Org users can view invoice items" ON public.invoice_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.id = invoice_items.invoice_id AND i.org_id = get_user_org_id(auth.uid())
    )
);

CREATE TABLE public.client_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    invoice_id uuid REFERENCES public.invoices(id),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    payment_method text NOT NULL DEFAULT 'cash',
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    reference text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org users can manage client payments" ON public.client_payments
FOR ALL TO authenticated
USING (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Org users can view client payments" ON public.client_payments
FOR SELECT TO authenticated
USING (org_id = get_user_org_id(auth.uid()));
