-- ============================================================================
-- 002_community_social_features.sql
-- Community social feed: ensures all RPCs, indexes and RLS policies exist.
-- Tables (community_posts, post_likes, post_comments) already exist.
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- Ensure community_posts has updated_at column
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Ensure admin can delete any community post
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'community_posts'
      AND policyname = 'admin_delete_community_posts'
  ) THEN
    CREATE POLICY "admin_delete_community_posts"
      ON public.community_posts FOR DELETE TO authenticated
      USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Ensure admin can delete any comment
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'post_comments'
      AND policyname = 'admin_delete_post_comments'
  ) THEN
    CREATE POLICY "admin_delete_post_comments"
      ON public.post_comments FOR DELETE TO authenticated
      USING (
        user_id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- RPCs for atomic comment counts (same pattern as likes/prayers)
CREATE OR REPLACE FUNCTION increment_comments(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE community_posts
  SET comments_count = comments_count + 1
  WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION increment_comments(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION decrement_comments(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE community_posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION decrement_comments(uuid) TO authenticated;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_created   ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post           ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post        ON public.post_comments(post_id, created_at DESC);
