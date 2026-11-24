-- ==============================================================================
-- MIGRATION SUPABASE : INBOX WEBHOOKS IDEMPOTENTE & SÉQUESTRE ESCROW
-- Date : 2026-11-24
-- Complète 20261120120000_production_security_rls_and_atomic_splits.sql
-- ==============================================================================

-- 1. TABLE : payment_webhook_inbox (Persistance brute avant traitement & anti-rejeu)
CREATE TABLE IF NOT EXISTS public.payment_webhook_inbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL,
    gateway_transaction_id TEXT,
    order_id TEXT,
    signature TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'received', -- received, processed, failed, rejected
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_inbox_gateway_tx
    ON public.payment_webhook_inbox(gateway, gateway_transaction_id)
    WHERE gateway_transaction_id IS NOT NULL AND gateway_transaction_id <> '';

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_status ON public.payment_webhook_inbox(status);
CREATE INDEX IF NOT EXISTS idx_webhook_inbox_order_id ON public.payment_webhook_inbox(order_id);

ALTER TABLE public.payment_webhook_inbox ENABLE ROW LEVEL SECURITY;

-- 2. TABLE : escrow_transactions (Séquestre Wameet / Chat-Finance sur Supabase)
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    chat_id TEXT,
    message_id TEXT,
    buyer_id TEXT,
    seller_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, locked, completed, refunded, failed
    escrow_status TEXT NOT NULL DEFAULT 'pending',
    is_paid BOOLEAN NOT NULL DEFAULT false,
    operator TEXT,
    transaction_id TEXT,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    locked_at TIMESTAMPTZ DEFAULT NULL,
    released_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_tx_chat_id ON public.escrow_transactions(chat_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_buyer_id ON public.escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_seller_id ON public.escrow_transactions(seller_id);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
