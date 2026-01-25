-- Estate Manual MVP Database Schema

-- Custom ENUM types
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'crew', 'vendor');
CREATE TYPE public.asset_type AS ENUM ('plant', 'tree', 'irrigation_controller', 'valve', 'lighting_transformer', 'hardscape', 'equipment', 'structure');
CREATE TYPE public.plant_category AS ENUM ('ornamental', 'edible', 'structural', 'ecological', 'other');
CREATE TYPE public.native_status AS ENUM ('native', 'naturalized', 'exotic', 'invasive');
CREATE TYPE public.task_frequency AS ENUM ('once', 'weekly', 'monthly', 'quarterly', 'annual', 'seasonal');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.document_category AS ENUM ('warranty', 'asbuilt', 'irrigation', 'lighting', 'planting_plan', 'vendor_contract', 'insurance', 'other');
CREATE TYPE public.weather_rule_type AS ENUM ('freeze', 'heavy_rain', 'high_wind', 'drought');
CREATE TYPE public.alert_status AS ENUM ('active', 'acknowledged', 'resolved');

-- Organizations (multi-tenant)
CREATE TABLE public.organizations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles with organization membership
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    preferred_language TEXT NOT NULL DEFAULT 'en',
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Estates
CREATE TABLE public.estates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    address_text TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    boundary_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Zones within estates
CREATE TABLE public.zones (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    purpose_tags TEXT[] DEFAULT '{}',
    geometry_geojson JSONB,
    notes TEXT,
    color TEXT DEFAULT '#4CAF50',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plant profiles (reusable templates)
CREATE TABLE public.plant_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    common_name TEXT NOT NULL,
    scientific_name TEXT,
    category plant_category DEFAULT 'other',
    native_status native_status DEFAULT 'exotic',
    care_template_json JSONB,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Assets (the core entity)
CREATE TABLE public.assets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    asset_type asset_type NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    purpose_tags TEXT[] DEFAULT '{}',
    risk_flags TEXT[] DEFAULT '{}',
    critical_care_note TEXT,
    do_not_do_warnings TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    last_service_date DATE,
    install_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Asset photos
CREATE TABLE public.asset_photos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    geo_lat DOUBLE PRECISION,
    geo_lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plant instances (links assets to plant profiles)
CREATE TABLE public.plant_instances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL UNIQUE REFERENCES public.assets(id) ON DELETE CASCADE,
    plant_profile_id UUID REFERENCES public.plant_profiles(id) ON DELETE SET NULL,
    install_date DATE,
    quantity INTEGER DEFAULT 1,
    density TEXT,
    notes TEXT,
    risk_flags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vendors
CREATE TABLE public.vendors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service_type TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    title_es TEXT,
    description TEXT,
    description_es TEXT,
    frequency task_frequency DEFAULT 'once',
    due_date DATE,
    status task_status DEFAULT 'pending',
    assigned_to_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    required_photo BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Task completions (immutable audit trail)
CREATE TABLE public.task_completions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    completed_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    photo_url TEXT,
    notes TEXT,
    amendment_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Check-ins (duty-of-care log)
CREATE TABLE public.checkins (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checkin_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    gps_lat DOUBLE PRECISION,
    gps_lng DOUBLE PRECISION,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Documents (digital binder)
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    category document_category NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES public.zones(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QR labels for assets
CREATE TABLE public.qr_labels (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    label_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weather rules
CREATE TABLE public.weather_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    rule_type weather_rule_type NOT NULL,
    threshold_json JSONB NOT NULL,
    action_text TEXT NOT NULL,
    action_text_es TEXT,
    enabled BOOLEAN DEFAULT true,
    auto_create_tasks BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weather alerts
CREATE TABLE public.weather_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.weather_rules(id) ON DELETE SET NULL,
    fired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    severity TEXT DEFAULT 'warning',
    message TEXT NOT NULL,
    message_es TEXT,
    status alert_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_estates_org ON public.estates(org_id);
CREATE INDEX idx_zones_estate ON public.zones(estate_id);
CREATE INDEX idx_assets_estate ON public.assets(estate_id);
CREATE INDEX idx_assets_zone ON public.assets(zone_id);
CREATE INDEX idx_assets_type ON public.assets(asset_type);
CREATE INDEX idx_tasks_estate ON public.tasks(estate_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to_user_id);
CREATE INDEX idx_checkins_estate ON public.checkins(estate_id);
CREATE INDEX idx_checkins_user ON public.checkins(user_id);
CREATE INDEX idx_documents_estate ON public.documents(estate_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_weather_alerts_estate ON public.weather_alerts(estate_id);
CREATE INDEX idx_weather_alerts_status ON public.weather_alerts(status);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weather_alerts ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.profiles WHERE id = _user_id
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their org"
    ON public.profiles FOR SELECT
    USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Owners/Managers can view all roles in org"
    ON public.user_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = user_id
            AND p.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

CREATE POLICY "Owners can manage roles"
    ON public.user_roles FOR ALL
    USING (public.has_role(auth.uid(), 'owner'));

-- Organizations policies
CREATE POLICY "Users can view their org"
    ON public.organizations FOR SELECT
    USING (id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Owners can manage their org"
    ON public.organizations FOR ALL
    USING (
        id = public.get_user_org_id(auth.uid())
        AND public.has_role(auth.uid(), 'owner')
    );

-- Estates policies
CREATE POLICY "Users can view estates in their org"
    ON public.estates FOR SELECT
    USING (org_id = public.get_user_org_id(auth.uid()));

CREATE POLICY "Owners/Managers can manage estates"
    ON public.estates FOR ALL
    USING (
        org_id = public.get_user_org_id(auth.uid())
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Zones policies
CREATE POLICY "Users can view zones in their estates"
    ON public.zones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage zones"
    ON public.zones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Assets policies
CREATE POLICY "Users can view assets in their estates"
    ON public.assets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage assets"
    ON public.assets FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Asset photos policies
CREATE POLICY "Users can view asset photos"
    ON public.asset_photos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assets a
            JOIN public.estates e ON e.id = a.estate_id
            WHERE a.id = asset_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Authenticated users can add photos"
    ON public.asset_photos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.assets a
            JOIN public.estates e ON e.id = a.estate_id
            WHERE a.id = asset_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

-- Plant profiles policies (globally readable)
CREATE POLICY "Anyone can view plant profiles"
    ON public.plant_profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Owners/Managers can manage plant profiles"
    ON public.plant_profiles FOR ALL
    USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Plant instances policies
CREATE POLICY "Users can view plant instances"
    ON public.plant_instances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assets a
            JOIN public.estates e ON e.id = a.estate_id
            WHERE a.id = asset_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage plant instances"
    ON public.plant_instances FOR ALL
    USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- Vendors policies
CREATE POLICY "Users can view vendors"
    ON public.vendors FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage vendors"
    ON public.vendors FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Tasks policies
CREATE POLICY "Users can view tasks in their estates"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Vendors can view assigned tasks"
    ON public.tasks FOR SELECT
    USING (
        public.has_role(auth.uid(), 'vendor')
        AND assigned_vendor_id IN (
            SELECT v.id FROM public.vendors v
            JOIN public.estates e ON e.id = v.estate_id
            WHERE e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage tasks"
    ON public.tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

CREATE POLICY "Crew can update assigned tasks"
    ON public.tasks FOR UPDATE
    USING (
        assigned_to_user_id = auth.uid()
        AND public.has_role(auth.uid(), 'crew')
    );

-- Task completions policies
CREATE POLICY "Users can view completions"
    ON public.task_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.estates e ON e.id = t.estate_id
            WHERE t.id = task_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Crew/Vendors can create completions"
    ON public.task_completions FOR INSERT
    WITH CHECK (
        completed_by_user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.estates e ON e.id = t.estate_id
            WHERE t.id = task_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

-- Checkins policies
CREATE POLICY "Users can view checkins in their estates"
    ON public.checkins FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Authenticated users can create checkins"
    ON public.checkins FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

-- Documents policies
CREATE POLICY "Users can view documents"
    ON public.documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage documents"
    ON public.documents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- QR labels policies
CREATE POLICY "Users can view QR labels"
    ON public.qr_labels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage QR labels"
    ON public.qr_labels FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Weather rules policies
CREATE POLICY "Users can view weather rules"
    ON public.weather_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "Owners/Managers can manage weather rules"
    ON public.weather_rules FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Weather alerts policies
CREATE POLICY "Users can view weather alerts"
    ON public.weather_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
    );

CREATE POLICY "System can manage weather alerts"
    ON public.weather_alerts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.estates e
            WHERE e.id = estate_id
            AND e.org_id = public.get_user_org_id(auth.uid())
        )
        AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
    );

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_estates_updated_at BEFORE UPDATE ON public.estates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plant_profiles_updated_at BEFORE UPDATE ON public.plant_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plant_instances_updated_at BEFORE UPDATE ON public.plant_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weather_rules_updated_at BEFORE UPDATE ON public.weather_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_weather_alerts_updated_at BEFORE UPDATE ON public.weather_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();