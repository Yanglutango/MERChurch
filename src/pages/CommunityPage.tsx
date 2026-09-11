import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useRealTime } from '../hooks/useRealTime'
import { logActivity } from '../lib/activityLogger'
import {
  Heart, MessageSquare, Share2, Image, Send,
  Search, TrendingUp, UserPlus, X, Trash2, Loader2, Link2,
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

interface Comment {
  id: string; post_id: string; user_id: string; content: string; created_at: string;
  user: { username: string; avatar_url: string | null };
}

// Avatar de fallback — cor única (primary) para todos os utilizadores.
// Antes a cor mudava consoante era "eu" (navy) ou "outro" (teal), uma
// distinção sem significado real e inconsistente com o resto da app.
const Avatar = ({ url, name, size = 'h-9 w-9' }: { url?: string | null; name?: string; size?: string }) => (
  <div className={`${size} rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm overflow-hidden flex-shrink-0`}>
    {url ? (
      <img src={url} alt={name || 'Utilizador'} className="h-full w-full object-cover" />
    ) : (
      name?.charAt(0).toUpperCase() || 'U'
    )}
  </div>
)

const CommunityPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { version } = useRealTime()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [newPostContent, setNewPostContent] = useState('')
  const [imageInput, setImageInput] = useState('')
  const [showUrlField, setShowUrlField] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({})
  const [showCommentsFor, setShowCommentsFor] = useState<Record<string, boolean>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isGuest = user?.role === 'guest'

  useEffect(() => {
    loadPosts()
  }, [version])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('community_posts')
        .select('*, user:user_profiles(username, avatar_url)')
        .order('created_at', { ascending: false })

      if (error) throw error

      let postsWithLikes = (data || []) as Post[]
      if (user && !isGuest) {
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)

        const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || [])
        postsWithLikes = postsWithLikes.map(p => ({ ...p, has_liked: likedPostIds.has(p.id) }))
      }

      setPosts(postsWithLikes)
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar o feed da comunidade')
    } finally {
      setLoading(false)
    }
  }

  const loadCommentsForPost = async (postId: string) => {
    if (commentsByPost[postId]?.length) return
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }))
      const { data, error } = await supabase
        .from('post_comments')
        .select('*, user:user_profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setCommentsByPost(prev => ({ ...prev, [postId]: (data || []) as Comment[] }))
    } catch (error) {
      console.error('Error loading comments', error)
      toast.error('Não foi possível carregar os comentários')
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const toggleComments = async (postId: string) => {
    setShowCommentsFor(prev => ({ ...prev, [postId]: !prev[postId] }))
    if (!commentsByPost[postId]) await loadCommentsForPost(postId)
  }

  const handleAddComment = async (postId: string) => {
    if (isGuest) {
      toast.error('Crie uma conta para interagir com as publicações')
      return
    }

    const content = (commentInput[postId] || '').trim()
    if (!content) {
      toast.error('Escreva algo antes de comentar')
      return
    }

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: user!.id,
      content,
      created_at: new Date().toISOString(),
      user: { username: user!.username, avatar_url: user!.avatar_url || null }
    }

    setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), tempComment] }))
    setCommentInput(prev => ({ ...prev, [postId]: '' }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p))

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: user!.id, content })
        .select('*, user:user_profiles(username, avatar_url)')
        .single()

      if (error) throw error

      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === tempComment.id ? (data as Comment) : c)
      }))

      // 'comment_created' — adicionado ao ActivityType em activityLogger.ts
      // (ver nota no fim da resposta)
      await logActivity({
        type: 'comment_created',
        actorId: user!.id,
        actorName: user!.username,
        title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        referenceId: postId,
        referenceType: 'post_comment'
      })
    } catch (error) {
      console.error('Error adding comment', error)
      toast.error('Não foi possível adicionar o comentário')
      setCommentsByPost(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id) }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p))
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      const filePath = `community/${user!.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setImageInput(publicUrlData.publicUrl)
      toast.success('Imagem carregada')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Erro ao enviar imagem — tente colar uma URL directamente')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido')
      return
    }
    handleImageUpload(file)
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !imageInput.trim()) {
      toast.error('Escreva algo ou adicione uma imagem para publicar')
      return
    }

    try {
      setPublishing(true)

      const { data, error } = await supabase
        .from('community_posts')
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
        title: newPostContent.substring(0, 30) + (newPostContent.length > 30 ? '...' : ''),
        referenceId: data?.id,
        referenceType: 'post'
      })

      toast.success('Publicado com sucesso')
      setNewPostContent('')
      setImageInput('')
      setShowUrlField(false)
      setPosts([data, ...posts])
    } catch (error) {
      console.error(error)
      toast.error('Não foi possível publicar o post')
    } finally {
      setPublishing(false)
    }
  }

  const handleDeletePost = async () => {
    if (!confirmDeleteId) return
    const postId = confirmDeleteId
    const post = posts.find(p => p.id === postId)

    try {
      setDeletingPostId(postId)

      // Correcção: o upload da imagem vai para o bucket 'avatars' (ver
      // handleImageUpload), mas o código anterior tentava apagar do bucket
      // 'public' — que nunca existiu aqui. Resultado: toda imagem de post
      // apagado ficava órfã no storage para sempre. Corrigido para usar o
      // bucket real onde o ficheiro foi guardado.
      if (post?.image_url) {
        try {
          const marker = '/storage/v1/object/public/avatars/'
          const idx = post.image_url.indexOf(marker)
          if (idx !== -1) {
            const filePath = post.image_url.slice(idx + marker.length)
            await supabase.storage.from('avatars').remove([filePath])
          }
        } catch (imgError) {
          console.error('Error deleting image:', imgError)
        }
      }

      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user!.id)

      if (error) throw error

      setPosts(prev => prev.filter(p => p.id !== postId))

      await supabase.from('post_comments').delete().eq('post_id', postId)
      await supabase.from('post_likes').delete().eq('post_id', postId)

      toast.success('Post removido')

      // 'post_deleted' — adicionado ao ActivityType em activityLogger.ts
      await logActivity({
        type: 'post_deleted',
        actorId: user!.id,
        actorName: user!.username,
        title: 'Post removido',
        referenceId: postId,
        referenceType: 'post'
      })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Não foi possível remover o post')
    } finally {
      setDeletingPostId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleLike = async (postId: string, hasLiked: boolean) => {
    if (isGuest) {
      toast.error('Crie uma conta para interagir com as publicações')
      return
    }

    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, has_liked: !hasLiked, likes_count: hasLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
        : p
    ))

    try {
      if (hasLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user!.id)
        if (error) throw error
        await supabase.rpc('decrement_likes', { post_id: postId })
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user!.id })
        if (error) throw error
        await supabase.rpc('increment_likes', { post_id: postId })
      }
    } catch (error) {
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, has_liked: hasLiked, likes_count: hasLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1) }
          : p
      ))
      console.error('Like error:', error)
    }
  }

  // Substituído o link morto para '/community/post/:id' (rota que não existe
  // na app) por partilha real: Web Share API no mobile, cópia do texto para
  // a área de transferência como fallback — mesmo padrão já usado no Logos AI.
  const handleShare = async (post: Post) => {
    const text = post.content.length > 140 ? post.content.slice(0, 140) + '…' : post.content
    if (navigator.share) {
      try {
        await navigator.share({ text: `${post.user?.username} na comunidade KAIRÓS: "${text}"` })
      } catch {
        // utilizador cancelou — sem acção necessária
      }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Texto copiado')
    }
  }

  const navigateToProfile = (userId?: string) => {
    if (isGuest) return
    if (!userId && user) navigate(`/profile/${user.id}`)
    else if (userId) navigate(`/profile/${userId}`)
  }

  const filteredPosts = posts.filter(p =>
    p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.user?.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const trending = posts
    .filter(p => (p.likes_count || 0) > 0)
    .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
    .slice(0, 5)

  if (loading) return <Layout title="Comunidade"><LoadingState fullScreen message="Carregando feed..." /></Layout>

  return (
    <Layout title="Comunidade">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Cabeçalho — sem ícone decorativo, texto simples como as outras páginas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Comunidade</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Compartilhe testemunhos, reflexões e conecte-se</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar no feed..."
              className="pl-9 h-9 rounded-md"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">

          <div className="lg:col-span-2 space-y-4">

            {/* Composer */}
            {!isGuest && (
              <Card className="p-4 border rounded-lg space-y-3">
                <div className="flex gap-3 items-start">
                  <button onClick={() => navigateToProfile()} className="hover:opacity-80 transition-opacity">
                    <Avatar url={user?.avatar} name={user?.username} />
                  </button>
                  <Textarea
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder={`O que está no seu coração hoje, ${user?.username}?`}
                    className="min-h-[72px] border-none focus-visible:ring-0 resize-none p-0 text-sm bg-transparent flex-1"
                  />
                </div>

                {/* Imagem — URL directa (compacta) ou upload de ficheiro, sem sobrepor os dois fluxos */}
                {imageInput ? (
                  <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md border border-border">
                    {uploadingImage ? (
                      <div className="flex items-center gap-2 flex-1 py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Enviando imagem...</span>
                      </div>
                    ) : (
                      <>
                        <img
                          src={imageInput}
                          className="h-9 w-9 rounded object-cover border border-border flex-shrink-0"
                          alt="Pré-visualização"
                          onError={() => setImageInput('')}
                        />
                        <span className="text-xs text-muted-foreground flex-1 truncate">Imagem anexada</span>
                      </>
                    )}
                    <button
                      onClick={() => { setImageInput(''); setShowUrlField(false) }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground flex-shrink-0"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : showUrlField ? (
                  <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md border border-border">
                    <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={imageInput}
                      onChange={e => setImageInput(e.target.value)}
                      placeholder="Cole a URL de uma imagem..."
                      className="h-7 border-none bg-transparent text-xs focus-visible:ring-0 p-0 flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowUrlField(false)}
                      className="p-1 hover:bg-muted rounded text-muted-foreground flex-shrink-0"
                      aria-label="Cancelar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button" variant="ghost" size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Image className="h-4 w-4 mr-1.5" strokeWidth={1.75} />Foto
                    </Button>
                    {!imageInput && (
                      <Button
                        type="button" variant="ghost" size="sm"
                        onClick={() => setShowUrlField(v => !v)}
                        className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <Link2 className="h-4 w-4 mr-1.5" strokeWidth={1.75} />URL
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={handleCreatePost}
                    disabled={publishing || (!newPostContent.trim() && !imageInput.trim())}
                    size="sm"
                    className="h-8 rounded-md px-4"
                  >
                    {publishing ? 'Publicando...' : <><Send className="h-3.5 w-3.5 mr-1.5" />Publicar</>}
                  </Button>
                </div>
              </Card>
            )}

            {/* Feed */}
            <div className="space-y-4">
              {filteredPosts.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Nenhuma publicação" description="Seja o primeiro a compartilhar algo com a comunidade" />
              ) : (
                filteredPosts.map(post => {
                  const isOwnPost = user?.id === post.user_id
                  return (
                    <Card key={post.id} className="p-4 border rounded-lg space-y-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button onClick={() => navigateToProfile(post.user_id)} className="hover:opacity-80 transition-opacity">
                            <Avatar url={post.user?.avatar_url} name={post.user?.username} />
                          </button>
                          <div>
                            <button
                              onClick={() => navigateToProfile(post.user_id)}
                              className="font-medium text-foreground text-sm hover:underline block text-left leading-tight"
                            >
                              {post.user?.username || 'Usuário'}
                            </button>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {new Date(post.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        {isOwnPost && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => setConfirmDeleteId(post.id)}
                            disabled={deletingPostId === post.id}
                            className="h-8 w-8 p-0 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            aria-label="Remover post"
                          >
                            {deletingPostId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                        {post.image_url && (
                          <div className="rounded-md overflow-hidden border border-border bg-muted/30 max-h-96 flex items-center justify-center">
                            <img
                              src={post.image_url}
                              alt="Publicação da comunidade"
                              className="w-full h-full object-cover max-h-96"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-1 border-t border-border">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleLike(post.id, !!post.has_liked)}
                          className={`h-8 rounded-md px-2.5 text-xs font-medium gap-1.5 ${post.has_liked ? 'text-rose-600' : 'text-muted-foreground'}`}
                        >
                          <Heart className={`h-4 w-4 ${post.has_liked ? 'fill-rose-600' : ''}`} strokeWidth={1.75} />
                          {post.likes_count || 0}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => toggleComments(post.id)}
                          className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground gap-1.5"
                        >
                          <MessageSquare className="h-4 w-4" strokeWidth={1.75} />
                          {post.comments_count || 0}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleShare(post)}
                          className="h-8 rounded-md px-2.5 text-xs font-medium text-muted-foreground"
                          aria-label="Compartilhar publicação"
                        >
                          <Share2 className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </div>

                      {showCommentsFor[post.id] && (
                        <div className="pt-3 border-t border-border space-y-3">
                          {loadingComments[post.id] ? (
                            <p className="text-sm text-muted-foreground">Carregando comentários...</p>
                          ) : (
                            <>
                              {(commentsByPost[post.id] || []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
                              ) : (
                                (commentsByPost[post.id] || []).map(comment => (
                                  <div key={comment.id} className="flex items-start gap-3">
                                    <Avatar url={comment.user?.avatar_url} name={comment.user?.username} size="h-8 w-8" />
                                    <div className="flex-1">
                                      <div className="font-medium text-sm text-foreground">{comment.user?.username || 'Usuário'}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {new Date(comment.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}

                              {!isGuest ? (
                                <div className="flex items-start gap-3">
                                  <Avatar url={user?.avatar} name={user?.username} />
                                  <div className="flex-1">
                                    <Textarea
                                      value={commentInput[post.id] || ''}
                                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      placeholder="Escreva um comentário..."
                                      className="min-h-[44px] border-none focus-visible:ring-0 resize-none p-0 text-sm bg-transparent"
                                    />
                                    <div className="flex justify-end pt-2">
                                      <Button size="sm" onClick={() => handleAddComment(post.id)} className="h-8 rounded-md px-3">
                                        Comentar
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Crie uma conta para comentar.</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            {isGuest && (
              <GuestPrompt
                title="Faça parte da nossa rede"
                description="Crie uma conta para publicar, interagir, curtir e comentar nos posts dos irmãos."
                actionLabel="Criar Conta"
                onAction={() => navigate('/auth')}
              />
            )}

            <Card className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                <h3 className="font-medium text-sm text-foreground">Em destaque</h3>
              </div>
              <div className="space-y-2.5">
                {trending.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum post em destaque ainda</p>
                ) : (
                  trending.map((post, idx) => (
                    <div key={post.id} className="flex items-start gap-2.5">
                      <span className="text-xs font-medium text-muted-foreground w-4 flex-shrink-0 mt-0.5 tabular-nums">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground leading-snug line-clamp-2">
                          {post.content.slice(0, 60)}{post.content.length > 60 ? '…' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5" strokeWidth={2} />{post.likes_count}
                          </span>
                          <span>{post.user?.username}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover publicação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingPostId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} disabled={!!deletingPostId} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deletingPostId ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default CommunityPage
