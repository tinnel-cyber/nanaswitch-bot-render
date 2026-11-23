-- ==============================================================================
-- Migration Production : Soldes atomiques dans Supabase + Unicité sur la référence de paiement (anti-doublon)
-- ==============================================================================

-- 1. Colonne payment_reference normalisée et contrainte UNIQUE anti-doublon sur wallet_transactions
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Backfill éventuel depuis metadata->>'reference'
UPDATE public.wallet_transactions
SET payment_reference = NULLIF(BTRIM(metadata->>'reference'), '')
WHERE payment_reference IS NULL
  AND metadata IS NOT NULL
  AND COALESCE(BTRIM(metadata->>'reference'), '') <> '';

-- Dédoublonnage défensif avant création de l'index unique (conserve la 1ère transaction par payment_reference)
DELETE FROM public.wallet_transactions a
USING public.wallet_transactions b
WHERE a.payment_reference IS NOT NULL
  AND a.payment_reference = b.payment_reference
  AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_transactions_payment_reference
  ON public.wallet_transactions (payment_reference)
  WHERE payment_reference IS NOT NULL;

-- 2. Unicité sur transaction_id dans merchant_subscriptions (anti-double activation d'abonnement)
CREATE UNIQUE INDEX IF NOT EXISTS uq_merchant_subscriptions_transaction_id
  ON public.merchant_subscriptions (transaction_id)
  WHERE transaction_id IS NOT NULL AND BTRIM(transaction_id) <> '';

-- 3. Fonction transactionnelle atomique RPC : apply_universe_wallet_mutation_atomic
--    - Verrouille la ligne `universes` avec SELECT ... FOR UPDATE (zéro race condition)
--    - Insère la transaction avec payment_reference UNIQUE (anti-double crédit / anti-double débit)
--    - Vérifie que le solde ne devient jamais négatif lors d'un débit (RAISE EXCEPTION 'INSUFFICIENT_BALANCE')
--    - Met à jour atomiquement `universes.balances` (et `merchants.balances` si présent)
CREATE OR REPLACE FUNCTION public.apply_universe_wallet_mutation_atomic(
  p_tx_id TEXT,
  p_universe_id TEXT,
  p_user_id UUID DEFAULT NULL,
  p_type TEXT DEFAULT 'CREDIT',
  p_delta_xof NUMERIC DEFAULT 0,
  p_payment_reference TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'COMPLETED',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_ref TEXT := NULLIF(BTRIM(COALESCE(p_payment_reference, '')), '');
  v_existing_tx public.wallet_transactions%ROWTYPE;
  v_balances JSONB;
  v_current_xof NUMERIC := 0;
  v_next_xof NUMERIC := 0;
  v_next_balances JSONB;
  v_universe_uuid UUID := NULL;
BEGIN
  IF p_tx_id IS NULL OR BTRIM(p_tx_id) = '' THEN
    RAISE EXCEPTION 'INVALID_TX_ID';
  END IF;

  IF p_universe_id IS NULL OR BTRIM(p_universe_id) = '' THEN
    RAISE EXCEPTION 'INVALID_UNIVERSE_ID';
  END IF;

  -- 1. Anti-doublon atomique par ID ou par référence de paiement
  SELECT * INTO v_existing_tx
  FROM public.wallet_transactions
  WHERE id = p_tx_id
     OR (v_clean_ref IS NOT NULL AND payment_reference = v_clean_ref)
  LIMIT 1;

  IF FOUND THEN
    BEGIN
      v_universe_uuid := p_universe_id::UUID;
      SELECT balances INTO v_balances FROM public.universes WHERE id = v_universe_uuid;
    EXCEPTION WHEN OTHERS THEN
      v_balances := NULL;
    END;
    v_current_xof := COALESCE((v_balances->>'XOF')::NUMERIC, 0);
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'txId', v_existing_tx.id,
      'paymentReference', v_existing_tx.payment_reference,
      'balanceXof', v_current_xof,
      'balances', COALESCE(v_balances, jsonb_build_object('XOF', v_current_xof, 'USD', 0, 'XAF', 0, 'GNF', 0, 'GHS', 0))
    );
  END IF;

  -- 2. Verrouillage atomique de la ligne de l'univers (FOR UPDATE)
  BEGIN
    v_universe_uuid := p_universe_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_universe_uuid := NULL;
  END;

  IF v_universe_uuid IS NOT NULL THEN
    SELECT balances INTO v_balances
    FROM public.universes
    WHERE id = v_universe_uuid
    FOR UPDATE;
  END IF;

  IF v_balances IS NULL THEN
    v_balances := '{"XOF": 0, "USD": 0, "XAF": 0, "GNF": 0, "GHS": 0}'::jsonb;
  END IF;

  v_current_xof := COALESCE((v_balances->>'XOF')::NUMERIC, 0);
  v_next_xof := ROUND(v_current_xof + COALESCE(p_delta_xof, 0));

  IF v_next_xof < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: available=% requested=%', v_current_xof, ABS(p_delta_xof)
      USING ERRCODE = 'P0002';
  END IF;

  v_next_balances := jsonb_set(v_balances, '{XOF}', to_jsonb(v_next_xof), true);

  -- 3. Insertion de l'écriture comptable avec contrainte UNIQUE sur payment_reference
  INSERT INTO public.wallet_transactions (
    id,
    universe_id,
    user_id,
    type,
    amount,
    payment_reference,
    status,
    metadata,
    created_at
  )
  VALUES (
    p_tx_id,
    p_universe_id,
    p_user_id,
    p_type,
    ABS(COALESCE(p_delta_xof, 0)),
    v_clean_ref,
    COALESCE(p_status, 'COMPLETED'),
    COALESCE(p_metadata, '{}'::jsonb),
    NOW()
  );

  -- 4. Mise à jour atomique du solde dans public.universes (et public.merchants si existant)
  IF v_universe_uuid IS NOT NULL THEN
    UPDATE public.universes
    SET balances = v_next_balances,
        updated_at = NOW()
    WHERE id = v_universe_uuid;
  END IF;

  IF to_regclass('public.merchants') IS NOT NULL THEN
    BEGIN
      UPDATE public.merchants
      SET balances = v_next_balances,
          updated_at = NOW()
      WHERE id::TEXT = p_universe_id;
    EXCEPTION WHEN OTHERS THEN
      -- ignore si schéma merchants différent
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'txId', p_tx_id,
    'paymentReference', v_clean_ref,
    'previousBalanceXof', v_current_xof,
    'balanceXof', v_next_xof,
    'balances', v_next_balances
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_universe_wallet_mutation_atomic(TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_universe_wallet_mutation_atomic(TEXT, TEXT, UUID, TEXT, NUMERIC, TEXT, TEXT, JSONB) TO service_role;
