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
  Search, TrendingUp, Sparkles, UserPlus, X, Flame, Trash2, Loader2
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
  const [uploadingImage, setUploadingImage] = useState(false)
  
  // Comments state
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({})
  const [showCommentsFor, setShowCommentsFor] = useState<Record<string, boolean>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})
  
  // Delete state
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const isGuest = user?.role === 'guest'

  useEffect(() => {
    loadPosts()
  }, [version])

  const loadPosts = async () => {
    try {
      setLoading(true)
      // community_posts é o nome real da tabela (não 'posts')
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

  const loadCommentsForPost = async (postId: string) => {
    // prevent reloading if already loaded
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
      toast.error('Escreva algo antes de comentar!')
      return
    }

    // optimistic UI update
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

      // Replace temp comment with saved comment
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).map(c => c.id === tempComment.id ? (data as Comment) : c)
      }))

      // Optional: log activity
      await logActivity({
        type: 'comment_created',
        actorId: user!.id,
        actorName: user!.username,
        title: content.substring(0, 30) + '...',
        referenceId: postId,
        referenceType: 'post_comment'
      })

    } catch (error) {
      console.error('Error adding comment', error)
      toast.error('Não foi possível adicionar seu comentário')
      // revert optimistic update
      setCommentsByPost(prev => ({ ...prev, [postId]: (prev[postId] || []).filter(c => c.id !== tempComment.id) }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 1) - 1) } : p))
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      // Usar o bucket 'avatars' existente para imagens de comunidade (pasta separada)
      // ou fazer upload para spiritual-resources com path específico
      const filePath = `community/${user!.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setImageInput(publicUrlData.publicUrl)
      toast.success('Imagem carregada com sucesso!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Erro ao fazer upload — use uma URL de imagem diretamente')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageIconClick = () => {
    setShowImageField(!showImageField)
    if (!showImageField && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem válido')
        return
      }

      handleImageUpload(file)
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

  const handleDeletePost = async (postId: string, imageUrl: string | null) => {
    if (!confirm('Tem certeza que deseja deletar este post?')) {
      return
    }

    try {
      setDeletingPostId(postId)

      // Delete image if exists
      if (imageUrl) {
        try {
          const urlParts = imageUrl.split('/storage/v1/object/public/public/')
          if (urlParts.length > 1) {
            const filePath = urlParts[1]
            await supabase.storage.from('public').remove([filePath])
          }
        } catch (imgError) {
          console.error('Error deleting image:', imgError)
          // Continue with post deletion even if image deletion fails
        }
      }

      // Delete post
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user!.id)

      if (error) throw error

      // Remove from local state
      setPosts(prev => prev.filter(p => p.id !== postId))

      // Delete associated comments
      await supabase
        .from('post_comments')
        .delete()
        .eq('post_id', postId)

      // Delete associated likes
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)

      toast.success('Post deletado com sucesso')

      await logActivity({
        type: 'post_deleted',
        actorId: user!.id,
        actorName: user!.username,
        title: 'Post deletado',
        referenceId: postId,
        referenceType: 'post'
      })
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Não foi possível deletar o post')
    } finally {
      setDeletingPostId(null)
    }
  }

  const handleLike = async (postId: string, hasLiked: boolean) => {
    if (isGuest) {
      toast.error('Crie uma conta para interagir com as publicações')
      return
    }

    // Optimistic update first
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
    } catch (error: any) {
      // Revert optimistic update on error
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, has_liked: hasLiked, likes_count: hasLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1) }
          : p
      ))
      console.error('Like error:', error)
    }
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
                    className="h-9 w-9 rounded-full bg-[#0A2E4A] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
                  >
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
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
                    {uploadingImage ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Enviando imagem...</span>
                      </div>
                    ) : (
                      <>
                        <Input 
                          value={imageInput}
                          onChange={e => setImageInput(e.target.value)}
                          placeholder="Cole a URL de uma imagem ou use o botão para fazer upload..." 
                          className="h-7 border-none bg-transparent text-xs focus-visible:ring-0 p-0 flex-1"
                        />
                        {imageInput && (
                          <img src={imageInput} className="h-7 w-7 rounded object-cover border border-border/40" alt="Preview" onError={() => setImageInput('')} />
                        )}
                      </>
                    )}
                    <button onClick={() => { setShowImageField(false); setImageInput('') }} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={handleImageIconClick}
                    disabled={uploadingImage}
                    className={`h-8 rounded-xl px-3 text-xs font-medium transition-colors ${showImageField ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Image className="h-4 w-4 mr-1.5 text-emerald-500" /> {uploadingImage ? 'Enviando...' : 'Adicionar Foto'}
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
                  const isOwnPost = user?.id === post.user_id
                  return (
                    <Card key={post.id} className="p-4 border border-border/40 bg-card rounded-2xl shadow-sm space-y-3.5">
                      {/* Top Meta Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => navigateToProfile(post.user_id)}
                            className="h-9 w-9 rounded-full bg-[#4A90A4] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden flex-shrink-0 transition-opacity hover:opacity-80"
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
                        {isOwnPost && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeletePost(post.id, post.image_url)}
                            disabled={deletingPostId === post.id}
                            className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            {deletingPostId === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
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
                          onClick={() => toggleComments(post.id)}
                          className="h-8 rounded-xl px-3 text-xs font-medium text-muted-foreground gap-1.5"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments_count || 0}</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => !isGuest && navigate(`/community/post/${post.id}`)}
                          className="h-8 rounded-xl px-3 text-xs font-medium text-muted-foreground gap-1.5"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Comments Section (collapsible) */}
                      {showCommentsFor[post.id] && (
                        <div className="pt-3">
                          {loadingComments[post.id] ? (
                            <div className="text-sm text-muted-foreground">Carregando comentários...</div>
                          ) : (
                            <div className="space-y-3">
                              {(commentsByPost[post.id] || []).length === 0 ? (
                                <div className="text-sm text-muted-foreground">Seja o primeiro a comentar.</div>
                              ) : (
                                (commentsByPost[post.id] || []).map(comment => (
                                  <div key={comment.id} className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-[#4A90A4] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                                      {comment.user?.avatar_url ? (
                                        <img src={comment.user.avatar_url} alt={comment.user.username} className="h-full w-full object-cover" />
                                      ) : (
                                        comment.user?.username?.charAt(0).toUpperCase() || 'U'
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="font-semibold text-sm">{comment.user?.username || 'Usuário'}</div>
                                          <div className="text-[11px] text-muted-foreground/80">{new Date(comment.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                      </div>
                                      <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}

                              {/* Add comment input */}
                              {!isGuest ? (
                                <div className="flex items-start gap-3">
                                  <div className="h-9 w-9 rounded-full bg-[#0A2E4A] text-white flex items-center justify-center font-bold text-sm overflow-hidden flex-shrink-0">
                                    {user?.avatar ? (
                                      <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
                                    ) : (
                                      user?.username?.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <Textarea
                                      value={commentInput[post.id] || ''}
                                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                      placeholder="Escreva um comentário..."
                                      className="min-h-[48px] border-none focus-visible:ring-0 resize-none p-0 text-sm bg-transparent placeholder:text-muted-foreground/60"
                                    />
                                    <div className="flex justify-end pt-2">
                                      <Button size="sm" onClick={() => handleAddComment(post.id)} className="h-8 bg-[#0A2E4A] text-white rounded-xl px-3">Comentar</Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground">Crie uma conta para comentar.</div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

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
                {posts
                  .filter(p => (p.likes_count || 0) > 0)
                  .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
                  .slice(0, 5)
                  .map((post, idx) => (
                    <div key={post.id} className="flex items-start gap-2.5 group">
                      <span className={`text-[11px] font-black w-5 flex-shrink-0 mt-0.5 ${
                        idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-slate-300'
                      }`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug group-hover:text-[#0A2E4A] dark:group-hover:text-zinc-100 transition-colors">
                          {post.content.substring(0, 60)}{post.content.length > 60 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-rose-500 font-semibold flex items-center gap-0.5">
                            <Heart className="h-2.5 w-2.5 fill-rose-500" /> {post.likes_count}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{post.user?.username}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
                {posts.filter(p => (p.likes_count || 0) > 0).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum post em destaque ainda</p>
                )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default CommunityPage
