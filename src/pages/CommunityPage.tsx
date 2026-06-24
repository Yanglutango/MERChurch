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

    loading = true
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
  
  const toggleLike = async (postId: string) => {
    if (!user) return

    // 1. Guardar o snapshot do estado atual para caso ocorra algum erro na API (Rollback)
    const previousPosts = [...posts]

    // 2. Encontrar o post alvo
    const targetPost = posts.find(p => p.id === postId)
    if (!targetPost) return

    // Definir se estamos curtindo ou descurtindo com base no estado atual
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

        const [likeRes, countRes] = await Promise.all([deleteLike, updateCount])
        if (likeRes.error) throw likeRes.error
      } else {
        // Se não estava curtido: Insere o registro e incrementa no banco
        const insertLike = supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
        const updateCount = supabase.rpc('increment_likes', { post_id: postId })

        const [likeRes, countRes] = await Promise.all([insertLike, updateCount])
        
        // Se der erro de restrição única (código 23505), significa que já foi inserido de outra forma, ignoramos o erro
        if (likeRes.error && likeRes.error.code !== '23505') throw likeRes.error
      }
    } catch (error) {
      console.error('Erro ao alternar o like:', error)
      // 4. ROLLBACK: Se a API falhar, desfaz a alteração na tela na hora
      setPosts(previousPosts)
      toast.error('Não foi possível computar a sua reação. Tente novamente.')
    }
  }

  return (
    <Layout title="Comunidade">
      <div className="space-y-6 max-w-4xl mx-auto font-sans antialiased">
        
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-card">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=600&fit=crop&q=80"
              alt="Community"
              className="w-full h-full object-cover opacity-35 dark:opacity-20 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-background dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-background" />
          </div>
          
          <div className="relative z-10 p-6 sm:p-8 md:p-10 text-foreground">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-muted/80 backdrop-blur-md rounded-full border border-border/40 shadow-sm">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
                  {isAdmin ? 'Moderação Comunitária' : 'Comunidade MER'}
                </span>
              </div>

              <div className="space-y-2">
                {isGuest && (
                  <>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0A2E4A] dark:text-zinc-100">
                      Comunhão <span className="text-primary bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">Viva</span>
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      Veja como nossa comunidade compartilha fé, testemunhos e encorajamento mútuo.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0A2E4A] dark:text-zinc-100">
                      Sua Comunidade Espiritual
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      Compartilhe sua jornada, encoraje irmãos e cresça em comunhão.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2.5 text-[#0A2E4A] dark:text-zinc-100">
                      <Shield className="h-7 w-7 text-primary/80" />
                      Moderar Comunidade
                    </h1>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                      Cuide da comunidade com sabedoria pastoral. Destaque conteúdo edificante.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                {isGuest && (
                  <Button
                    size="sm"
                    onClick={() => navigate('/about')}
                    className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium rounded-xl px-5 py-5 transition-all shadow-sm"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Participar da Comunidade
                  </Button>
                )}
                {!isGuest && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 rounded-xl px-4 py-2 border border-border/30 w-max">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    {posts.length} Publicações
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Create Post - Apenas Member/Admin */}
        {!isGuest && (
          <Card className="p-5 border border-border/50 bg-card/70 backdrop-blur-md shadow-sm rounded-2xl">
            <div className="flex gap-4">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} className="h-10 w-10 rounded-full flex-shrink-0 border border-border/60 object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 space-y-3">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Compartilhe algo edificante com a comunidade..."
                  rows={3}
                  className="resize-none bg-background/40 rounded-xl border-border/60 focus-visible:ring-muted-foreground/20 placeholder:text-muted-foreground/60 text-sm"
                />

                <div className="flex justify-between items-center">
                  <Button variant="ghost" size="sm" disabled className="text-muted-foreground/60 hover:bg-transparent rounded-lg text-xs">
                    <ImageIcon className="h-4 w-4 mr-1.5" />
                    Foto
                  </Button>

                  <Button onClick={createPost} disabled={loading || !newPost.trim()} className="h-9 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium rounded-xl px-4 shadow-sm text-xs">
                    {loading ? 'Publicando...' : 'Publicar'}
                    <Send className="h-3 w-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Posts Feed */}
        {loadingPosts ? (
          <LoadingState message="Carregando publicações..." />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title={isGuest ? 'Área restrita' : 'Nenhuma publicação ainda'}
            description={isGuest ? 'Torne-se membro para ver e participar da comunidade' : 'Seja o primeiro a compartilhar algo edificante!'}
            action={
              isGuest ? (
                <Button onClick={() => navigate('/about')} className="bg-[#0A2E4A] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Tornar-se Membro
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="group p-5 border border-border/40 hover:border-border/80 bg-card transition-all shadow-sm rounded-2xl">
                <div className="flex gap-4">
                  <Link to={`/profile/${post.userId}`} className="flex-shrink-0">
                    {post.user?.avatar ? (
                      <img src={post.user.avatar} alt={post.user.username} className="h-10 w-10 rounded-full border border-border/40 hover:opacity-90 transition-opacity object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-muted to-muted/60 border border-border/50 flex items-center justify-center text-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
                        {post.user?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Link to={`/profile/${post.userId}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors block">
                          {post.user?.username || 'Usuário'}
                        </Link>
                        <span className="text-[11px] text-muted-foreground/80">
                          {new Date(post.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex gap-1">
                        {isAdmin && (
                          <AdminAction>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 rounded-lg text-muted-foreground transition-opacity">
                              <Pin className="h-3.5 w-3.5" />
                            </Button>
                          </AdminAction>
                        )}
                        {(post.userId === user?.id || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletePostId(post.id)}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 rounded-lg text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-foreground/90 text-sm mb-3.5 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                    {post.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-border/40 mb-3.5 bg-muted/30">
                        <img
                          src={post.imageUrl}
                          alt="Post"
                          className="max-h-96 w-full object-cover transition-transform duration-300 hover:scale-[1.01]"
                        />
                      </div>
                    )}

                    {!isGuest && (
                      <div className="flex gap-3 pt-2 border-t border-border/40">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(post.id)}
                          className={`h-8 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                            post.isLiked 
                              ? 'text-red-600 hover:text-red-700 bg-red-500/5 dark:bg-red-500/10' 
                              : 'text-muted-foreground hover:text-red-600'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 mr-1.5 transition-transform active:scale-125 ${post.isLiked ? 'fill-red-600 text-red-600' : ''}`} />
                          {post.likesCount || 0}
                        </Button>

                        <Button variant="ghost" size="sm" className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-primary font-medium">
                          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={open => { if (!open) setDeletePostId(null) }}>
        <AlertDialogContent className="rounded-2xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold tracking-tight">Remover publicação?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. O conteúdo deixará de ser exibido para os outros membros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border/80 text-xs font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePost} className="bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-xs">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default CommunityPage
