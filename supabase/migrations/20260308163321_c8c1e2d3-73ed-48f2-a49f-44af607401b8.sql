-- Subscriptions table to track PayPal payments
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type text NOT NULL DEFAULT 'monthly',
    status text NOT NULL DEFAULT 'inactive',
    paypal_order_id text,
    paypal_capture_id text,
    amount numeric NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
ON public.subscriptions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();