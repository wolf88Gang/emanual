-- Create table for topographic references per estate
CREATE TABLE public.topographic_references (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    geometry_geojson JSONB NOT NULL,
    geometry_type TEXT NOT NULL, -- 'Point', 'LineString', 'Polygon', 'MultiPolygon'
    source_filename TEXT,
    analysis_data JSONB, -- Stores computed analysis results
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.topographic_references ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view topographic references for their org estates"
ON public.topographic_references
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.estates e
        JOIN public.profiles p ON p.org_id = e.org_id
        WHERE e.id = topographic_references.estate_id
        AND p.id = auth.uid()
    )
);

CREATE POLICY "Owners and managers can manage topographic references"
ON public.topographic_references
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.estates e
        JOIN public.profiles p ON p.org_id = e.org_id
        WHERE e.id = topographic_references.estate_id
        AND p.id = auth.uid()
        AND public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_topographic_references_updated_at
BEFORE UPDATE ON public.topographic_references
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for transect profiles
CREATE TABLE public.elevation_transects (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
    name TEXT,
    line_geojson JSONB NOT NULL,
    profile_data JSONB, -- Array of {distance, elevation} points
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.elevation_transects ENABLE ROW LEVEL SECURITY;

-- Create policies for transects
CREATE POLICY "Users can view transects for their org estates"
ON public.elevation_transects
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.estates e
        JOIN public.profiles p ON p.org_id = e.org_id
        WHERE e.id = elevation_transects.estate_id
        AND p.id = auth.uid()
    )
);

CREATE POLICY "Owners and managers can manage transects"
ON public.elevation_transects
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.estates e
        JOIN public.profiles p ON p.org_id = e.org_id
        WHERE e.id = elevation_transects.estate_id
        AND p.id = auth.uid()
        AND public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
    )
);