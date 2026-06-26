-- 006_post_likes_rpc.sql
-- O código de CommunityPage.tsx já chama increment_likes/decrement_likes
-- via supabase.rpc(). Estas funções nunca existiram no banco — todo clique
-- em "curtir" falhava silenciosamente. Esta migration cria as funções,
-- seguindo exactamente o padrão já usado em increment_prayer_count (004).
-- NÃO recria a tabela post_likes — ela já existe e está em uso.

CREATE OR REPLACE FUNCTION increment_likes(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE community_posts
  SET likes_count = likes_count + 1
  WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION increment_likes(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION decrement_likes(post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE community_posts
  SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = post_id;
$$;

GRANT EXECUTE ON FUNCTION decrement_likes(uuid) TO authenticated;
