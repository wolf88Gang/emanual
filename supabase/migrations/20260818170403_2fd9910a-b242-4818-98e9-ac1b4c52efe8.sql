ALTER TABLE public.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_status_chk;
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_status_chk
  CHECK (status = ANY (ARRAY['draft','active','ended','cancelled']));

ALTER TABLE public.rental_contracts DROP CONSTRAINT IF EXISTS rental_contracts_billing_chk;
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_billing_chk
  CHECK (billing_period IS NULL OR billing_period = ANY (ARRAY['monthly','quarterly','event','other']));