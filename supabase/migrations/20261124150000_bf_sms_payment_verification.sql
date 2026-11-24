-- ==============================================================================
-- MIGRATION SUPABASE : VÉRIFICATION TEMPS RÉEL DES PAIEMENTS SMS BURKINA FASO
-- Date : 2026-11-24
-- Permet à UltimateCheckout de comparer en temps réel les SMS reçus (Orange / Wave BF)
-- avec l'ID de transaction ou le SMS collé par le client burkinabè.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.bf_sms_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'ORANGE_MONEY',
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'XOF',
    sender_phone TEXT DEFAULT NULL,
    merchant_code TEXT DEFAULT NULL,
    raw_sms TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'unmatched', -- unmatched | matched | consumed
    matched_order_id TEXT DEFAULT NULL,
    matched_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bf_sms_payments_tx_id_exact
    ON public.bf_sms_payments (transaction_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bf_sms_payments_tx_id_unique
    ON public.bf_sms_payments (UPPER(TRIM(transaction_id)));

CREATE INDEX IF NOT EXISTS idx_bf_sms_payments_status
    ON public.bf_sms_payments (status);

CREATE INDEX IF NOT EXISTS idx_bf_sms_payments_matched_order
    ON public.bf_sms_payments (matched_order_id)
    WHERE matched_order_id IS NOT NULL;

ALTER TABLE public.bf_sms_payments ENABLE ROW LEVEL SECURITY;

-- Autoriser la lecture pour l'écoute Supabase Realtime dans UltimateCheckout
DROP POLICY IF EXISTS "bf_sms_payments_realtime_select" ON public.bf_sms_payments;
CREATE POLICY "bf_sms_payments_realtime_select"
    ON public.bf_sms_payments
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Autoriser l'insertion par le service_role (relais SMS / Edge Function / Backend)
DROP POLICY IF EXISTS "bf_sms_payments_service_insert" ON public.bf_sms_payments;
CREATE POLICY "bf_sms_payments_service_insert"
    ON public.bf_sms_payments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Activer Supabase Realtime sur bf_sms_payments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'bf_sms_payments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bf_sms_payments;
    END IF;
END $$;

-- RPC atomique de vérification / rapprochement d'un SMS ou ID de paiement BF
CREATE OR REPLACE FUNCTION public.verify_bf_sms_payment(
    p_order_id TEXT,
    p_transaction_id TEXT,
    p_expected_amount NUMERIC,
    p_customer_phone TEXT DEFAULT NULL,
    p_merchant_code TEXT DEFAULT NULL,
    p_operator TEXT DEFAULT NULL,
    p_raw_input TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_tx TEXT;
    v_sms_row public.bf_sms_payments%ROWTYPE;
BEGIN
    v_clean_tx := UPPER(TRIM(COALESCE(p_transaction_id, '')));

    IF v_clean_tx = '' OR LENGTH(v_clean_tx) < 4 THEN
        RETURN jsonb_build_object(
            'matched', false,
            'reason', 'INVALID_TRANSACTION_ID'
        );
    END IF;

    -- Verrouiller la ligne correspondante pour éviter tout double usage (race condition)
    SELECT *
    INTO v_sms_row
    FROM public.bf_sms_payments
    WHERE UPPER(TRIM(transaction_id)) = v_clean_tx
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'matched', false,
            'pending', true,
            'transaction_id', v_clean_tx,
            'reason', 'SMS_NOT_RECEIVED_YET'
        );
    END IF;

    -- Déjà consommé par une AUTRE commande
    IF v_sms_row.status IN ('matched', 'consumed')
       AND COALESCE(v_sms_row.matched_order_id, '') <> ''
       AND v_sms_row.matched_order_id <> p_order_id THEN
        RETURN jsonb_build_object(
            'matched', false,
            'alreadyUsed', true,
            'reason', 'TRANSACTION_ALREADY_USED'
        );
    END IF;

    -- Vérifier le montant (tolérance 0 : le montant reçu doit couvrir le montant attendu)
    IF p_expected_amount IS NOT NULL AND p_expected_amount > 0 AND ROUND(v_sms_row.amount) < ROUND(p_expected_amount) THEN
        RETURN jsonb_build_object(
            'matched', false,
            'reason', 'AMOUNT_MISMATCH',
            'received_amount', v_sms_row.amount,
            'expected_amount', p_expected_amount
        );
    END IF;

    -- Vérifier le code marchand si fourni sur le SMS et attendu côté boutique physique
    IF COALESCE(TRIM(p_merchant_code), '') <> ''
       AND COALESCE(TRIM(v_sms_row.merchant_code), '') <> ''
       AND REGEXP_REPLACE(v_sms_row.merchant_code, '[^0-9]', '', 'g') <> REGEXP_REPLACE(p_merchant_code, '[^0-9]', '', 'g') THEN
        RETURN jsonb_build_object(
            'matched', false,
            'reason', 'MERCHANT_CODE_MISMATCH'
        );
    END IF;

    -- Validation atomique
    UPDATE public.bf_sms_payments
    SET
        status = 'matched',
        matched_order_id = p_order_id,
        matched_at = COALESCE(matched_at, NOW())
    WHERE id = v_sms_row.id;

    RETURN jsonb_build_object(
        'matched', true,
        'id', v_sms_row.id,
        'transaction_id', v_sms_row.transaction_id,
        'operator', v_sms_row.operator,
        'amount', v_sms_row.amount,
        'currency', v_sms_row.currency,
        'merchant_code', v_sms_row.merchant_code,
        'matched_order_id', p_order_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_bf_sms_payment(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
