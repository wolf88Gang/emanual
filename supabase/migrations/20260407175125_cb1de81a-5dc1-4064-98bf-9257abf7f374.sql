
-- Create enum for entry types
CREATE TYPE public.financial_entry_type AS ENUM ('income', 'expense');

-- Create enum for tax jurisdictions
CREATE TYPE public.tax_jurisdiction AS ENUM ('US', 'CR');

-- Create the financial_entries table
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.estates(id) ON DELETE SET NULL,
  entry_type public.financial_entry_type NOT NULL DEFAULT 'expense',
  tax_jurisdiction public.tax_jurisdiction NOT NULL DEFAULT 'US',
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  notes TEXT,
  receipt_url TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_deductible BOOLEAN NOT NULL DEFAULT false,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  vendor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- Owners/Managers can manage financial entries
CREATE POLICY "Owners/Managers can manage financial entries"
ON public.financial_entries
FOR ALL
TO authenticated
USING (
  (org_id = get_user_org_id(auth.uid()))
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  (org_id = get_user_org_id(auth.uid()))
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Org users can view financial entries
CREATE POLICY "Org users can view financial entries"
ON public.financial_entries
FOR SELECT
TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_financial_entries_updated_at
BEFORE UPDATE ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
