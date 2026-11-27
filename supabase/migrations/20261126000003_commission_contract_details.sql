-- Migration: Enrichissement de commission_accounts pour le contrat signé, les 2 numéros de paiement,
-- le contact d'urgence, la signature manuscrite et la copie Super Admin Dashboard.

ALTER TABLE public.commission_accounts
  ALTER COLUMN commission_rate_percent SET DEFAULT 14.00;

ALTER TABLE public.commission_accounts
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS business_domain TEXT,
  ADD COLUMN IF NOT EXISTS payment_number_1 TEXT,
  ADD COLUMN IF NOT EXISTS payment_number_2 TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS signature_data_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_number TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_html TEXT,
  ADD COLUMN IF NOT EXISTS admin_notified BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS admin_reviewed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_commission_acc_contract_num ON public.commission_accounts(contract_number);
