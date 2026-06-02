-- ATOMIC INCREMENT FUNCTION FOR PRAYER_COUNT
-- AVOID RACE CONDITION WHEN TWO USERS PRAY SIMULTANEOUSLY

CREATE OR REPLACE FUNCTION increment_prayer_count(p_prayer_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER AS $$
UPDATE prayer_requests
SET prayer_count = prayer_count + 1
WHERE id = p_prayer_id;
$$;

-- PERMISSION FOR AUTHENTICATED USERS
GRANT EXECUTE ON FUNCTION increment_prayer_count(uuid) TO authenticated;

-- NOTIFICATION_PREFERENCES
ALTER TABLE public.users_profiles
ADD COLUMN IF NOT EXISTS notification_preferences jsonb
DEFAULT '{"prayer": true, "events": true, "counseling": true, "announcements": true, "community": true}';

-- RLS: Permit delete in prayer_requests
-- User can delete his own requests

CREATE POLICY IF NOT EXISTS "user_delete_own prayer" ON public.prayer_requests
FOR DELETE TO authenticated USING (user_id = auth.uid())

-- Admin can delete any request

CREATE POLICY IF NOT EXISTS "admin_delete_any_prayer" ON public.prayer_requests
FOR DELETE TO authenticated USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) ='admin'
);

-- RLS: Permit delete in transactions
-- Only admin can delete transactions

CREATE POLICY IF NOT EXISTS "admin_delete_transactions" ON public.transactions
FOR DELETE TO authenticated USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) ='admin'
);
