-- Worker rates table: supports CRC/USD, hourly/daily/task rates
CREATE TABLE public.worker_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CRC')),
  rate_type TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'daily', 'task')),
  rate_amount DECIMAL(12, 2) NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shift validations table: approval workflow
CREATE TABLE public.shift_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.worker_shifts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'adjusted', 'rejected', 'paid')),
  decision_type TEXT CHECK (decision_type IN ('approval', 'adjustment', 'rejection')),
  adjusted_minutes INTEGER,
  original_minutes INTEGER,
  decision_message TEXT,
  ai_generated_message TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shift payments table: track actual payments
CREATE TABLE public.shift_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.worker_shifts(id) ON DELETE CASCADE,
  validation_id UUID REFERENCES public.shift_validations(id),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'CRC')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('transfer', 'cash', 'check', 'other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference TEXT,
  notes TEXT,
  paid_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_payments ENABLE ROW LEVEL SECURITY;

-- Worker rates policies
CREATE POLICY "Owners/Managers can manage worker rates"
ON public.worker_rates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = worker_rates.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Users can view rates in their estates"
ON public.worker_rates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM estates e 
    WHERE e.id = worker_rates.estate_id 
    AND e.org_id = get_user_org_id(auth.uid())
  )
);

-- Shift validations policies
CREATE POLICY "Owners/Managers can manage validations"
ON public.shift_validations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM worker_shifts ws
    JOIN estates e ON e.id = ws.estate_id
    WHERE ws.id = shift_validations.shift_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Users can view validations in their estates"
ON public.shift_validations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM worker_shifts ws
    JOIN estates e ON e.id = ws.estate_id
    WHERE ws.id = shift_validations.shift_id 
    AND e.org_id = get_user_org_id(auth.uid())
  )
);

-- Shift payments policies
CREATE POLICY "Owners/Managers can manage payments"
ON public.shift_payments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM worker_shifts ws
    JOIN estates e ON e.id = ws.estate_id
    WHERE ws.id = shift_payments.shift_id 
    AND e.org_id = get_user_org_id(auth.uid())
  ) 
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Users can view payments in their estates"
ON public.shift_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM worker_shifts ws
    JOIN estates e ON e.id = ws.estate_id
    WHERE ws.id = shift_payments.shift_id 
    AND e.org_id = get_user_org_id(auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_worker_rates_updated_at
BEFORE UPDATE ON public.worker_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_validations_updated_at
BEFORE UPDATE ON public.shift_validations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();