import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { MessageCircle, Heart, Send, Trash2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { CommunityPost } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'

const CommunityPage = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoadingPosts(true)
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        user:user_profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading posts:', error)
      setLoadingPosts(false)
      return
    }

    setPosts(data as any)
    setLoadingPosts(false)
  }

  const createPost = async () => {
    if (!newPost.trim() || loading) return

    setLoading(true)
    try {
      const { error } = await supabase.from('community_posts').insert({
        user_id: user!.id,
        content: newPost.trim(),
      })

      if (error) throw error

      setNewPost('')
      loadPosts()
      toast.success('Publicação criada!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar publicação')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId)

    if (error) {
      toast.error('Erro ao excluir publicação')
      return
    }

    setPosts(posts.filter((p) => p.id !== postId))
    toast.success('Publicação excluída')
  }

  const toggleLike = async (postId: string) => {
    // Check if already liked
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user!.id)
      .single()

    if (existingLike) {
      // Unlike
      await supabase.from('post_likes').delete().eq('id', existingLike.id)
      
      // Update count
      await supabase.rpc('decrement_likes', { post_id: postId })
    } else {
      // Like
      await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: user!.id,
      })

      // Update count
      await supabase.rpc('increment_likes', { post_id: postId })
    }

    loadPosts()
  }

  return (
    <Layout title="Comunidade">
      <div className="max-w-3xl mx-auto space-y-6">
        <PageHeader
          title="Comunidade"
          description="Conecte-se com outros membros e compartilhe sua fé"
          icon={MessageCircle}
          gradient="from-pink-500 via-purple-500 to-indigo-500"
        />
        {/* Create Post */}
        <Card className="p-6 border-2">
          <div className="flex gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="h-12 w-12 rounded-full flex-shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 space-y-3">
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Compartilhe algo com a comunidade..."
                rows={3}
                className="resize-none"
              />

              <div className="flex justify-between items-center">
                <Button variant="ghost" size="sm" disabled>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Foto
                </Button>

                <Button onClick={createPost} disabled={loading || !newPost.trim()}>
                  {loading ? 'Publicando...' : 'Publicar'}
                  <Send className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Posts */}
        {loadingPosts ? (
          <LoadingState message="Carregando publicações..." />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma publicação ainda"
            description="Seja o primeiro a compartilhar algo com a comunidade!"
          />
        ) : (
          <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-6 border-2 hover:border-primary/30 transition-all">
              <div className="flex gap-4">
                {post.user?.avatar ? (
                  <img src={post.user.avatar} alt={post.user.username} className="h-12 w-12 rounded-full flex-shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                    {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-foreground">{post.user?.username || 'Usuário'}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {post.userId === user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="rounded-xl mb-4 max-h-96 object-cover"
                    />
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLike(post.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      {post.likesCount || 0}
                    </Button>

                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {post.commentsCount || 0}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CommunityPage
