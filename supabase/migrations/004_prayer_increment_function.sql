-- ─────────────────────────────────────────────────────────────────────────────
-- 004_prayer_increment_function.sql
-- Incremento atómico, notification_preferences, políticas RLS de DELETE
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Função de incremento atómico — sem race condition
CREATE OR REPLACE FUNCTION increment_prayer_count(p_prayer_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE prayer_requests
  SET prayer_count = prayer_count + 1
  WHERE id = p_prayer_id;
$$;

GRANT EXECUTE ON FUNCTION increment_prayer_count(uuid) TO authenticated;

-- 2. Coluna notification_preferences
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb
DEFAULT '{"prayer":true,"events":true,"counseling":true,"announcements":true,"community":true}';

-- 3. RLS DELETE em prayer_requests — utilizador apaga os seus próprios pedidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prayer_requests'
    AND policyname = 'user_delete_own_prayer'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "user_delete_own_prayer"
      ON public.prayer_requests
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
    $policy$;
  END IF;
END $$;

-- 4. RLS DELETE em prayer_requests — admin apaga qualquer pedido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'prayer_requests'
    AND policyname = 'admin_delete_any_prayer'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admin_delete_any_prayer"
      ON public.prayer_requests
      FOR DELETE TO authenticated
      USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
      );
    $policy$;
  END IF;
END $$;

-- 5. RLS DELETE em transactions — apenas admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'transactions'
    AND policyname = 'admin_delete_transactions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "admin_delete_transactions"
      ON public.transactions
      FOR DELETE TO authenticated
      USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
      );
    $policy$;
  END IF;
END $$;

-- 6. Coluna updated_at em transactions (necessária para o webhook Multicaixa)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION update_transaction_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS transactions_updated_at ON public.transactions;
CREATE TRIGGER transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_transaction_updated_at();

-- 7. Índice na referência de pagamento (acelera lookups do webhook)
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference
ON public.transactions(payment_reference)
WHERE payment_reference IS NOT NULL;
