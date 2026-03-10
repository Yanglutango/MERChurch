import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Heart, Plus, Check, Shield, UserPlus, Trash2, Star, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Testimony } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const TestimoniesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [testimonies, setTestimonies] = useState<Testimony[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTestimony, setNewTestimony] = useState({
    title: '',
    content: '',
    category: '',
    isAnonymous: false,
  })

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadTestimonies()
  }, [])

  const loadTestimonies = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('testimonies')
      .select(`
        *,
        user:user_profiles(username, avatar_url)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading testimonies:', error)
      setLoading(false)
      return
    }

    setTestimonies(data as any)
    setLoading(false)
  }

  const createTestimony = async () => {
    if (!newTestimony.title.trim() || !newTestimony.content.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    const { error } = await supabase.from('testimonies').insert({
      user_id: user!.id,
      title: newTestimony.title,
      content: newTestimony.content,
      category: newTestimony.category,
      is_anonymous: newTestimony.isAnonymous,
    })

    if (error) {
      toast.error('Erro ao criar testemunho')
      return
    }

    toast.success('Testemunho enviado para aprovação! 🙏')
    setIsDialogOpen(false)
    setNewTestimony({ title: '', content: '', category: '', isAnonymous: false })
  }

  const approveTestimony = async (testimonyId: string) => {
    const { error } = await supabase
      .from('testimonies')
      .update({ is_approved: true, approved_by: user!.id })
      .eq('id', testimonyId)

    if (error) {
      toast.error('Erro ao aprovar testemunho')
      return
    }

    toast.success('Testemunho aprovado!')
    loadTestimonies()
  }

  const deleteTestimony = async (testimonyId: string) => {
    if (!confirm('Tem certeza que deseja remover este testemunho?')) return

    const { error } = await supabase
      .from('testimonies')
      .delete()
      .eq('id', testimonyId)

    if (error) {
      toast.error('Erro ao remover testemunho')
      return
    }

    toast.success('Testemunho removido')
    loadTestimonies()
  }

  if (loading) {
    return (
      <Layout title="Testemunhos">
        <LoadingState fullScreen message="Carregando testemunhos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Testemunhos">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Hero Banner */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=600&fit=crop&q=80"
              alt="Testimonies"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-700/96 via-orange-700/94 to-yellow-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE TESTEMUNHOS' : isGuest ? 'HISTÓRIAS DE TRANSFORMAÇÃO' : 'COMPARTILHE SUA HISTÓRIA'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Vidas{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Transformadas
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Conheça histórias reais de pessoas que experimentaram o poder de Deus na MER.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Compartilhe sua{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        História
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Seu testemunho pode inspirar outros a conhecer Jesus. Declare o que Deus fez em sua vida.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Moderar Testemunhos
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Aprove testemunhos autênticos e edificantes para compartilhar com a comunidade.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {!isGuest && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-white text-amber-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Compartilhar Testemunho
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl">Compartilhar Testemunho</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Título *</Label>
                          <Input
                            id="title"
                            value={newTestimony.title}
                            onChange={(e) => setNewTestimony({ ...newTestimony, title: e.target.value })}
                            placeholder="Ex: Como Deus me libertou da depressão"
                          />
                        </div>

                        <div>
                          <Label htmlFor="category">Categoria</Label>
                          <Select
                            value={newTestimony.category}
                            onValueChange={(value) => setNewTestimony({ ...newTestimony, category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="salvacao">Salvação</SelectItem>
                              <SelectItem value="cura">Cura</SelectItem>
                              <SelectItem value="libertacao">Libertação</SelectItem>
                              <SelectItem value="provisao">Provisão</SelectItem>
                              <SelectItem value="restauracao">Restauração</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="content">Sua História *</Label>
                          <Textarea
                            id="content"
                            value={newTestimony.content}
                            onChange={(e) => setNewTestimony({ ...newTestimony, content: e.target.value })}
                            placeholder="Compartilhe como Deus agiu em sua vida..."
                            rows={8}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="anonymous"
                            checked={newTestimony.isAnonymous}
                            onCheckedChange={(checked) =>
                              setNewTestimony({ ...newTestimony, isAnonymous: checked as boolean })
                            }
                          />
                          <label
                            htmlFor="anonymous"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Testemunho anônimo
                          </label>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg border-2 border-border">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            ℹ️ Seu testemunho será revisado pela equipe pastoral antes de ser publicado para garantir edificação e autenticidade.
                          </p>
                        </div>

                        <Button onClick={createTestimony} className="w-full gradient-primary text-white">
                          Enviar Testemunho
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-amber-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Compartilhar
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        {!isGuest && (
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            <StatCard
              icon={Sparkles}
              label="Testemunhos Publicados"
              value={testimonies.length}
              gradient="from-amber-500 to-orange-500"
            />
            <StatCard
              icon={Heart}
              label="Vidas Transformadas"
              value={testimonies.length * 3}
              gradient="from-purple-500 to-pink-500"
            />
          </div>
        )}

        {/* Testimonies List */}
        {testimonies.length > 0 && (
          <div className="space-y-6">
            {testimonies.map((testimony) => (
              <Card key={testimony.id} className="p-6 md:p-8 border-2 hover:border-amber-500/30 transition-all elevation-1">
                <div className="flex gap-6">
                  {!testimony.isAnonymous && testimony.user?.avatar_url ? (
                    <img
                      src={testimony.user.avatar_url}
                      alt={testimony.user.username}
                      className="h-16 w-16 rounded-full flex-shrink-0 object-cover border-2 border-amber-500/30"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
                      {testimony.isAnonymous ? '?' : testimony.user?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-foreground mb-1">{testimony.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{testimony.isAnonymous ? 'Anônimo' : testimony.user?.username}</span>
                          <span>•</span>
                          <span>
                            {new Date(testimony.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          {testimony.category && (
                            <>
                              <span>•</span>
                              <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full capitalize">
                                {testimony.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <AdminAction>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTestimony(testimony.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                      <p className="text-foreground leading-[1.75] whitespace-pre-wrap">{testimony.content}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-border/50">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-800 rounded-xl">
                        <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                          Testemunho Aprovado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && testimonies.length > 0 && (
          <GuestPrompt
            title="Compartilhe sua transformação"
            description="Membros podem compartilhar testemunhos de como Deus transformou suas vidas e inspirar outros na jornada da fé."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}

        {/* Empty State */}
        {testimonies.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="Nenhum testemunho publicado"
            description={
              isGuest
                ? 'Testemunhos de transformação aparecerão aqui em breve'
                : isAdmin
                ? 'Aprove testemunhos enviados pelos membros'
                : 'Seja o primeiro a compartilhar como Deus transformou sua vida'
            }
            action={
              !isGuest ? (
                <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Compartilhar Primeiro Testemunho
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Layout>
  )
}

export default TestimoniesPage
