import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useRealTime } from '../hooks/useRealTime'
import { logActivity } from '../lib/activityLogger'
import { 
  Heart, MessageSquare, Share2, Image, Send, 
  Search, TrendingUp, Sparkles, UserPlus, X, Flame 
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

interface Post {
  id: string; user_id: string; content: string; image_url: string | null;
  created_at: string; likes_count: number; comments_count: number;
  user: { username: string; avatar_url: string | null };
  has_liked?: boolean;
}

const CommunityPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { version } = useRealTime()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para a criação de novo post
  const [newPostContent, setNewPostContent] = useState('')
  const [imageInput, setImageInput] = useState('') // URL direta ou base64 de imagem
  const [showImageField, setShowImageField] = useState(false)
  const [publishing, setPublishing] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isGuest = user?.role === 'guest'

  useEffect(() => {
    loadPosts()
  }, [version])

  const loadPosts = async () => {
    try {
      setLoading(true)
      // Busca os posts com os perfis dos usuários vinculados
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:user_profiles(username, avatar_url)')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Se houver um usuário logado, podemos verificar quais posts ele curtiu
      let postsWithLikes = (data || []) as Post[]
      if (user && !isGuest) {
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
        
        const likedPostIds = new Set(userLikes?.map(l => l.post_id) || [])
        postsWithLikes = postsWithLikes.map(p => ({
          ...p,
          has_liked: likedPostIds.has(p.id)
        }))
      }

      setPosts(postsWithLikes)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar o feed da comunidade')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !imageInput.trim()) {
      toast.error('Escreva algo ou adicione uma imagem para publicar!')
      return
    }

    try {
      setPublishing(true)
      
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user!.id,
          content: newPostContent.trim(),
          image_url: imageInput.trim() || null
        })
        .select('*, user:user_profiles(username, avatar_url)')
        .single()

      if (error) throw error

      await logActivity({
        type: 'post_created',
        actorId: user!.id,
        actorName: user!.username,
        title: newPostContent.substring(0, 30) + '...',
        referenceId: data?.id,
        referenceType: 'post'
      })

      toast.success('Publicado com sucesso! 🎉')
      setNewPostContent('')
      setImageInput('')
      setShowImageField(false)
      
      // Atualiza o feed local imediatamente
      setPosts([data, ...posts])
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível publicar seu post')
    } finally {
      setPublishing(false)
    }
  }

  const handleLike = async (postId: string, hasLiked: boolean) => {
    if (isGuest) {
      toast.error('Crie uma conta para interagir com as publicações')
      return
    }

    try {
      if (hasLiked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user!.id)
        setPosts(posts.map(p => p.id === postId ? { ...p, has_liked: false, likes_count: Math.max(0, p.likes_count - 1) } : p))
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user!.id })
        setPosts(posts.map(p => p.id === postId ? { ...p, has_liked: true, likes_count: p.likes_count + 1 } : p))
      }
    } catch (error) {
      console.error(error)
    }
  }

  // Simulação/Tratamento de upload local para link visual (ou input de URL de imagem)
  const handleImageIconClick = () => {
    setShowImageField(!showImageField)
  }

  const navigateToProfile = (userId?: string) => {
    if (isGuest) return
    if (!userId && user) {
      navigate(`/profile/${user.id}`)
    } else if (userId) {
      navigate(`/profile/${userId}`)
    }
  }

  const filteredPosts = posts.filter(p => 
    p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <Layout title="Comunidade"><LoadingState fullScreen message="Carregando feed..." /></Layout>

  return (
    <Layout title="Comunidade">
      <div className="max-w-7xl mx-auto p-4 space-y-6 font-sans antialiased">
        
        {/* Top Header Grid */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2E4A] dark:text-zinc-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" /> Painel da Comunidade
            </h1>
            <p className="text-xs text-muted-foreground">Compartilhe testemunhos, reflexões e conecte-se</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
            <Input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar no feed..." 
              className="pl-9 h-9 bg-card rounded-xl border-border/60 text-sm focus-visible:ring-muted-foreground/20"
            />
          </div>
        </div>

        {/* main layout column grids */}
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Box Criar Post Funcional */}
            {!isGuest && (
              <Card className="p-4 border border-border/50 shadow-sm bg-card rounded-2xl space-y-3">
                <div className="flex gap-3 items-start">
                  <button 
                    onClick={() => navigateToProfile()} 
                    className="h-9 w-9 rounded-full bg-[#0A2E4A] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden flex-shrink-0 transition-opacity hover:opacity-90"
                  >
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="h-full w-full object-cover" />
                    ) : (
                      user?.username?.charAt(0).toUpperCase()
                    )}
                  </button>
                  <div className="flex-1">
                    <Textarea 
                      value={newPostContent}
                      onChange={e => setNewPostContent(e.target.value)}
                      placeholder={`O que está no seu coração hoje, ${user?.username}?`}
                      className="min-h-[80px] border-none focus-visible:ring-0 resize-none p-0 text-sm bg-transparent placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                {/* Input Dinâmico de Imagem (Decorativo vira Funcional) */}
                {showImageField && (
                  <div className="relative flex items-center gap-2 bg-muted/50 p-2 rounded-xl border border-border/40 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Image className="h-4 w-4 text-muted-foreground ml-1" />
                    <Input 
                      value={imageInput}
                      onChange={e => setImageInput(e.target.value)}
                      placeholder="Cole a URL de uma imagem da internet aqui..." 
                      className="h-7 border-none bg-transparent text-xs focus-visible:ring-0 p-0 flex-1"
                    />
                    {imageInput && (
                      <img src={imageInput} className="h-7 w-7 rounded object-cover border border-border/40" alt="Preview" />
                    )}
                    <button onClick={() => { setShowImageField(false); setImageInput('') }} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={handleImageIconClick}
                    className={`h-8 rounded-xl px-3 text-xs font-medium transition-colors ${showImageField ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Image className="h-4 w-4 mr-1.5 text-emerald-500" /> Adicionar Foto
                  </Button>
                  <Button 
                    onClick={handleCreatePost}
                    disabled={publishing || (!newPostContent.trim() && !imageInput.trim())}
                    size="sm" 
                    className="h-8 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 text-white font-semibold rounded-xl px-4 shadow-sm"
                  >
                    {publishing ? 'Publicando...' : <><Send className="h-3.5 w-3.5 mr-1.5" /> Publicar</>}
                  </Button>
                </div>
              </Card>
            )}

            {/* Listagem de Posts */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Nenhuma publicação" description="Seja o primeiro a compartilhar algo com a comunidade!" />
              ) : (
                filteredPosts.map(post => {
                  const hasAvatar = !!post.user?.avatar_url
                  return (
                    <Card key={post.id} className="p-4 border border-border/40 bg-card rounded-2xl shadow-sm space-y-3.5">
                      {/* Top Meta Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => navigateToProfile(post.user_id)}
                            className="h-9 w-9 rounded-full bg-[#4A90A4] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden flex-shrink-0 transition-opacity hover:opacity-90"
                          >
                            {hasAvatar ? (
                              <img src={post.user.avatar_url!} alt={post.user.username} className="h-full w-full object-cover" />
                            ) : (
                              post.user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                          </button>
                          <div>
                            <button 
                              onClick={() => navigateToProfile(post.user_id)}
                              className="font-semibold text-foreground text-sm hover:underline block text-left leading-tight"
                            >
                              {post.user?.username || 'Usuário'}
                            </button>
                            <span className="text-[10px] text-muted-foreground/80 block mt-0.5">
                              {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(post.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="space-y-3">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {post.content}
                        </p>
                        {post.image_url && (
                          <div className="rounded-xl overflow-hidden border border-border/30 bg-muted/30 max-h-96 flex items-center justify-center">
                            <img 
                              src={post.image_url} 
                              alt="Publicação da comunidade" 
                              className="w-full h-full object-cover max-h-96"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-1 pt-1 border-t border-border/40">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleLike(post.id, !!post.has_liked)}
                          className={`h-8 rounded-xl px-3 text-xs font-medium gap-1.5 ${post.has_liked ? 'text-rose-500 hover:text-rose-600 bg-rose-500/5' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`h-4 w-4 ${post.has_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                          <span>{post.likes_count || 0}</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => !isGuest && navigate(`/community/post/${post.id}`)}
                          className="h-8 rounded-xl px-3 text-xs font-medium text-muted-foreground gap-1.5"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments_count || 0}</span>
                        </Button>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Column (Sidebar Extras) */}
          <div className="space-y-4">
            {isGuest && (
              <GuestPrompt 
                title="Faça parte da nossa rede" 
                description="Crie uma conta para publicar, interagir, curtir e comentar nos posts dos irmãos." 
                actionLabel="Criar Conta" 
                onAction={() => navigate('/auth')} 
              />
            )}

            {/* Trending / Hot Topics Box */}
            <Card className="p-4 border border-border/40 bg-card rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <TrendingUp className="h-4 w-4 text-[#0A2E4A] dark:text-zinc-300" />
                <h3 className="font-bold text-sm text-foreground">Em Destaque</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs group cursor-pointer">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-600 mt-0.5">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default CommunityPage
