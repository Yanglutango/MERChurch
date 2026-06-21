-- 005_ministries_rls.sql
-- Garante policies de RLS em ministries / ministry_members.
-- Sem isto, escritas (INSERT/DELETE) são negadas por padrão pelo Postgres.

ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministries' AND policyname='select_ministries') THEN
    EXECUTE $policy$
      CREATE POLICY "select_ministries" ON public.ministries
      FOR SELECT TO authenticated USING (true);
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministry_members' AND policyname='select_ministry_members') THEN
    EXECUTE $policy$
      CREATE POLICY "select_ministry_members" ON public.ministry_members
      FOR SELECT TO authenticated USING (true);
    $policy$;
  END IF;
END $$;

-- Membro entra sozinho
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministry_members' AND policyname='insert_own_membership') THEN
    EXECUTE $policy$
      CREATE POLICY "insert_own_membership" ON public.ministry_members
      FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
    $policy$;
  END IF;
END $$;

-- Membro sai sozinho
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministry_members' AND policyname='delete_own_membership') THEN
    EXECUTE $policy$
      CREATE POLICY "delete_own_membership" ON public.ministry_members
      FOR DELETE TO authenticated USING (user_id = auth.uid());
    $policy$;
  END IF;
END $$;

-- Admin gere qualquer membro (ex.: remover alguém)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministry_members' AND policyname='admin_manage_membership') THEN
    EXECUTE $policy$
      CREATE POLICY "admin_manage_membership" ON public.ministry_members
      FOR ALL TO authenticated
      USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin')
      WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');
    $policy$;
  END IF;
END $$;

-- Líder ou admin atualiza o ministério
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministries' AND policyname='leader_or_admin_update_ministry') THEN
    EXECUTE $policy$
      CREATE POLICY "leader_or_admin_update_ministry" ON public.ministries
      FOR UPDATE TO authenticated
      USING (
        leader_id = auth.uid()
        OR (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
      );
    $policy$;
  END IF;
END $$;

-- Admin cria/exclui ministérios
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministries' AND policyname='admin_insert_ministry') THEN
    EXECUTE $policy$
      CREATE POLICY "admin_insert_ministry" ON public.ministries
      FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ministries' AND policyname='admin_delete_ministry') THEN
    EXECUTE $policy$
      CREATE POLICY "admin_delete_ministry" ON public.ministries
      FOR DELETE TO authenticated
      USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin');
    $policy$;
  END IF;
END $$;
