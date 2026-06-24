import { useState, useEffect, useMemo, useCallback } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { 
  MessageSquare, 
  Heart, 
  Share2, 
  TrendingUp, 
  Plus, 
  Send, 
  Image as ImageIcon,
  Sparkles,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingState } from '../components/shared/LoadingState'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Interfaces estritas baseadas em dados reais
interface Post {
  id: string
  content: string
  imageUrl?: string
  createdAt: string
  userId: string
  likesCount: number
  commentsCount: number
  isPinned: boolean
  userProfile?: {
    fullName: string
    avatarUrl?: string
    role: string
  }
}

const CommunityPage = () => {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState('')

  // Mapeador seguro de banco de dados para evitar o erro de carregamento do feed
  const mapPostData = (raw: any): Post => ({
    id: raw.id,
    content: raw.content,
    imageUrl: raw.image_url || raw.imageUrl,
    createdAt: raw.created_at || raw.createdAt,
    userId: raw.user_id || raw.userId,
    likesCount: raw.likes_count || raw.likesCount || 0,
    commentsCount: raw.comments_count || raw.commentsCount || 0,
    isPinned: raw.is_pinned !== undefined ? raw.is_pinned : (raw.isPinned || false),
    userProfile: raw.profiles ? {
      fullName: raw.profiles.full_name || raw.profiles.fullName || 'Usuário MER',
      avatarUrl: raw.profiles.avatar_url || raw.profiles.avatarUrl,
      role: raw.profiles.role || 'member'
    } : undefined
  })

  // 1. CARREGAMENTO INICIAL COM TRATAMENTO DE ERROS CORRIGIDO
  const loadCommunityFeed = useCallback(async () => {
    try {
      // Fazemos o join com a tabela de perfis (ajuste 'profiles' se o nome da sua tabela de usuários for diferente)
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedPosts = (data || []).map(mapPostData)
      setPosts(formattedPosts)
    } catch (error) {
      console.error('Erro detalhado ao carregar feed:', error)
      // O erro só dispara se a requisição falhar criticamente no banco
      toast.error('Não foi possível sincronizar o feed com o servidor.')
    } finally {
      setLoading(false)
    }
  }, [])

  // 2. REALTIME ENGINE: Escuta e atualiza em tempo real sem buscas repetitivas (Evita ruídos de IA)
  useEffect(() => {
    loadCommunityFeed()

    // Inscreve o canal para ouvir qualquer mudança na tabela de posts da comunidade
    const communityChannel = supabase
      .channel('realtime-community')
      .on(
        'postgres_changes',
        { event: '*', scheme: 'public', table: 'community_posts' },
        () => {
          // Quando qualquer alteração real ocorre (Novo post, Like, Comentário, Pin), recarrega os dados reais
          loadCommunityFeed()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(communityChannel)
    }
  }, [loadCommunityFeed])

  // 3. SEÇÃO "EM DESTAQUE" - CÁLCULO DINÂMICO REAL TIME
  const trendingPosts = useMemo(() => {
    return [...posts]
      .sort((a, b) => {
        // Prioriza fixados estruturais primeiro
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        
        // Algoritmo de engajamento humano: Likes (peso 1) + Comentários (peso 2)
        const engagementA = (a.likesCount * 1) + (a.commentsCount * 2)
        const engagementB = (b.likesCount * 1) + (b.commentsCount * 2)
        return engagementB - engagementA
      })
      .slice(0, 3) // Exibe apenas o Top 3 quente do momento
  }, [posts])

  // Criação de nova publicação real
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Você precisa estar autenticado para publicar.')
      return
    }
    if (!newPostContent.trim()) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          content: newPostContent.trim(),
          image_url: newPostImage.trim() || null,
          user_id: user.id
        })

      if (error) throw error

      toast.success('Publicado com sucesso!')
      setNewPostContent('')
      setNewPostImage('')
    } catch (error) {
      console.error('Erro ao postar:', error)
      toast.error('Erro ao enviar publicação.')
    } finally {
      setSubmitting(false)
    }
  }

  // Ação de Like Real
  const handleLikePost = async (postId: string, currentLikes: number) => {
    try {
      // Exemplo simples de incremento direto (Idealmente mapeado em tabela pivot de likes)
      const { error } = await supabase
        .from('community_posts')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', postId)

      if (error) throw error
    } catch (error) {
      console.error('Erro ao curtir post:', error)
    }
  }

  if (loading) {
    return <LoadingState fullScreen message="Conectando ao canal da comunidade..." />
  }

  return (
    <Layout title="Comunidade MER">
      <div className="p-4 md:p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Coluna Central: Criação e Feed principal */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Caixa de Criação de Post */}
          {user?.role !== 'guest' && (
            <Card className="p-4 border rounded-2xl shadow-sm bg-card">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <textarea
                  placeholder={`No que você está pensando, ${user?.name || 'irmão'}? Compartilhe uma palavra ou testemunho...`}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={3}
                  className="w-full resize-none border-0 bg-transparent p-0 text-sm focus:ring-0 placeholder:text-muted-foreground text-foreground focus:outline-none"
                />
                
                {/* Campo opcional de imagem anexada */}
                <div className="flex items-center gap-2 pt-2 border-t border-dashed justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <input 
                      type="url" 
                      placeholder="URL opcional de imagem..." 
                      value={newPostImage}
                      onChange={(e) => setNewPostImage(e.target.value)}
                      className="bg-transparent border-0 text-xs w-full focus:outline-none focus:ring-0 text-muted-foreground"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={submitting || !newPostContent.trim()}
                    size="sm"
                    className="rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {submitting ? 'Enviando...' : 'Publicar'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Lista de Publicações Reais */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card className="p-8 text-center border-dashed border-2 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma publicação encontrada no momento.</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className={`p-5 border rounded-2xl shadow-sm bg-card transition-all ${post.isPinned ? 'border-amber-500/30 bg-amber-500/[0.01]' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-sm border">
                        {post.userProfile?.fullName.charAt(0).toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-foreground">{post.userProfile?.fullName}</h4>
                          {post.userProfile?.role === 'admin' && (
                            <span className="bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Líder</span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                        <Sparkles className="h-3 w-3 fill-current" /> Fixo
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-foreground mt-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                  {post.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden max-h-80 bg-muted border">
                      <img src={post.imageUrl} alt="Anexo da publicação" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Barra de Interações Reais */}
                  <div className="flex items-center gap-6 mt-5 pt-3 border-t text-muted-foreground">
                    <button 
                      onClick={() => handleLikePost(post.id, post.likesCount)}
                      className="flex items-center gap-1.5 text-xs hover:text-rose-500 transition-colors"
                    >
                      <Heart className="h-4 w-4" />
                      <span>{post.likesCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs">
                      <MessageSquare className="h-4 w-4" />
                      <span>{post.commentsCount}</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-xs hover:text-primary ml-auto">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Coluna Lateral: Painel "Em Destaque" 100% Real Time */}
        <div className="space-y-6">
          <Card className="p-5 border rounded-2xl shadow-sm bg-card space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <h3 className="font-bold text-base text-foreground">Em Destaque Agora</h3>
            </div>

            <div className="space-y-3.5">
              {trendingPosts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Sem interações de relevância no momento.</p>
              ) : (
                trendingPosts.map((trendPost, index) => (
                  <div 
                    key={`trend-${trendPost.id}`} 
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-border transition-all flex flex-col space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                        #{index + 1} Em Alta
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-semibold">
                        <span className="flex items-center gap-0.5"><Heart className="h-3 w-3 fill-current text-rose-500" /> {trendPost.likesCount}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3 text-blue-500" /> {trendPost.commentsCount}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-foreground line-clamp-2 font-medium leading-snug">
                      "{trendPost.content}"
                    </p>
                    
                    <span className="text-[10px] text-muted-foreground block text-right font-medium">
                      Por: {trendPost.userProfile?.fullName.split(' ')[0] || 'Membro'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
    </Layout>
  )
}

export default CommunityPage
