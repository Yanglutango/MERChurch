import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { MessageCircle, Heart, Send, Trash2, Image as ImageIcon, Shield, UserPlus, TrendingUp, Pin, Ban, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import type { CommunityPost } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const CommunityPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [deletePostId, setDeletePostId] = useState<string | null>(null)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

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
      .limit(isGuest ? 5 : 50)

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

  const deletePost = async () => {
    if (!deletePostId) return
    const { data, error } = await supabase.from('community_posts').delete().eq('id', deletePostId).select('id')
    setDeletePostId(null)
    if (error) { toast.error('Erro ao excluir'); return }
    if (!data || data.length === 0) { toast.error('Sem permissão para remover esta publicação'); return }
    setPosts(prev => prev.filter(p => p.id !== deletePostId))
    toast.success('Publicação removida')
  }
  
  // Substitua a sua função toggleLike antiga por esta:
  const toggleLike = async (postId: string) => {
    if (!user) return

    // 1. Guardar o snapshot do estado atual para caso ocorra algum erro na API (Rollback)
    const previousPosts = [...posts]

    // 2. Encontrar o post alvo
    const targetPost = posts.find(p => p.id === postId)
    if (!targetPost) return

    // Definir se estamos curtindo ou descurtindo com base no estado atual
    // Nota: Caso sua tabela não use 'isLiked', ela usará a lógica inversa do clique
    const isLiked = targetPost.isLiked ?? false 

    // 3. UI Otimista: Atualiza o estado visual do React INSTANTANEAMENTE
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const newIsLiked = !isLiked
          const currentCount = p.likesCount || 0
          return {
            ...p,
            isLiked: newIsLiked,
            likesCount: newIsLiked ? currentCount + 1 : Math.max(0, currentCount - 1)
          }
        }
        return p
      })
    )

    try {
      if (isLiked) {
        // Se já estava curtido: Remove o registro e decrementa no banco de forma segura
        const deleteLike = supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        const updateCount = supabase.rpc('decrement_likes', { post_id: postId }) 
        // Caso não tenha a RPC criada no banco, mantemos o fallback do update padrão abaixo:
        // const updateCount = supabase.from('community_posts').update({ likes_count: Math.max(0, (targetPost.likesCount || 1) - 1) }).eq('id', postId)

        const [likeRes, countRes] = await Promise.all([deleteLike, updateCount])
        if (likeRes.error) throw likeRes.error
      } else {
        // Se não estava curtido: Insere o registro e incrementa no banco
        const insertLike = supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
        const updateCount = supabase.rpc('increment_likes', { post_id: postId })
        // Caso não tenha a RPC criada no banco, usamos o fallback do update padrão:
        // const updateCount = supabase.from('community_posts').update({ likes_count: (targetPost.likesCount || 0) + 1 }).eq('id', postId)

        const [likeRes, countRes] = await Promise.all([insertLike, updateCount])
        
        // Se der erro de restrição única (código 23505), significa que já foi inserido de outra forma, ignoramos o erro
        if (likeRes.error && likeRes.error.code !== '23505') throw likeRes.error
      }
    } catch (error) {
      console.error('Erro ao alternar o like:', error)
      // 4. ROLLBACK: Se a API falhar por problemas de rede ou permissão, desfaz a alteração na tela na hora
      setPosts(previousPosts)
      toast.error('Não foi possível computar a sua reação. Tente novamente.')
    }
  }

  return (
    <Layout title="Comunidade">
      <div className="space-y-6">
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=600&fit=crop&q=80"
              alt="Community"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-pink-700/96 via-purple-700/94 to-indigo-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-12 text-white">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'MODERAÇÃO COMUNITÁRIA' : 'COMUNIDADE MER'}
                </span>
              </div>

              <div className="space-y-3">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                      Comunhão{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Viva
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed">
                      Veja como nossa comunidade compartilha fé, testemunhos e encorajamento mútuo.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">
                      Sua Comunidade Espiritual
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed">
                      Compartilhe sua jornada, encoraje irmãos e cresça em comunhão.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight flex items-center gap-3 flex-wrap">
                      <Shield className="h-10 w-10 md:h-12 md:w-12 text-yellow-300" />
                      Moderar Comunidade
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed">
                      Cuide da comunidade com sabedoria pastoral. Destaque conteúdo edificante.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/about')}
                    className="bg-white text-pink-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Participar da Comunidade
                  </Button>
                )}
                {!isGuest && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {posts.length} Publicações
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Create Post - Apenas Member/Admin */}
        {!isGuest && (
          <Card className="p-5 md:p-6 border-2 shadow-lg elevation-2">
            <div className="flex gap-4">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-12 w-12 md:h-14 md:w-14 rounded-full flex-shrink-0 border-2 border-primary/30" />
              ) : (
                <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 space-y-3">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Compartilhe algo edificante com a comunidade..."
                  rows={3}
                  className="resize-none border-2 focus:border-primary"
                />

                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" disabled className="text-muted-foreground">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Foto
                  </Button>

                  <Button onClick={createPost} disabled={loading || !newPost.trim()} className="gradient-primary text-white font-semibold">
                    {loading ? 'Publicando...' : 'Publicar'}
                    <Send className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Posts */}
        {loadingPosts ? (
          <LoadingState message="Carregando publicações..." />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={isGuest ? 'Área restrita' : 'Nenhuma publicação ainda'}
            description={isGuest ? 'Torne-se membro para ver e participar da comunidade' : 'Seja o primeiro a compartilhar algo edificante!'}
            action={
              isGuest ? (
                <Button onClick={() => navigate('/about')} className="gradient-primary text-white">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Tornar-se Membro
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="group p-5 md:p-6 border-2 hover:border-primary/30 transition-all elevation-1">
                <div className="flex gap-4">
                  {post.user?.avatar ? (
                    <Link to={`/profile/${post.userId}`}>
                      <img src={post.user.avatar} alt={post.user.username} className="h-12 w-12 rounded-full flex-shrink-0 border-2 border-primary/20 hover:opacity-80 transition-opacity" />
                    </Link>
                  ) : (
                    <Link to={`/profile/${post.userId}`}>
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md hover:opacity-80 transition-opacity">
                        {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </Link>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Link to={`/profile/${post.userId}`} className="font-bold text-base text-foreground hover:text-primary transition-colors">{post.user?.username || 'Usuário'}</Link>
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

                      <div className="flex gap-1">
                        {isAdmin && (
                          <AdminAction>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                              <Pin className="h-4 w-4 text-primary" />
                            </Button>
                          </AdminAction>
                        )}
                        {(post.userId === user?.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletePostId(post.id)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-foreground/90 mb-4 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt="Post"
                        className="rounded-xl mb-4 max-h-96 w-full object-cover shadow-md"
                      />
                    )}

                    {!isGuest && (
                      <div className="flex gap-4 pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(post.id)}
                          className="text-muted-foreground hover:text-red-600 font-medium"
                        >
                          <Heart className="h-4 w-4 mr-1.5" />
                          {post.likesCount || 0}
                        </Button>

                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary font-medium">
                          <MessageCircle className="h-4 w-4 mr-1.5" />
                          {post.commentsCount || 0}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && posts.length > 0 && (
          <GuestPrompt
            title="Participe da comunidade"
            description="Membros podem criar posts, comentar, reagir e conectar-se com outros irmãos em Cristo."
            actionLabel="Tornar-se Membro"
            onAction={() => navigate('/about')}
          />
        )}
      </div>
      <AlertDialog open={!!deletePostId} onOpenChange={open => { if (!open) setDeletePostId(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remover publicação?</AlertDialogTitle>
      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={deletePost} className="bg-red-600 hover:bg-red-700 text-white">
        Remover
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </Layout>
  )
}

export default CommunityPage
