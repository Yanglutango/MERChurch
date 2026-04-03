import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { BookOpen, Search, Play, Eye, Calendar, Clock, Plus, Edit2, Trash2, Shield, Star, UserPlus, TrendingUp, Filter } from 'lucide-react'
import { toast } from 'sonner'
import type { Sermon } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { SermonEditor } from '../components/admin/SermonEditor'

const SermonsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [sermons, setSermons] = useState<Sermon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadSermons()
  }, [])

  const loadSermons = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading sermons:', error)
      setLoading(false)
      return
    }

    setSermons(data)
    setLoading(false)
  }

  const handleEditorSuccess = () => {
    loadSermons()
    setEditingSermon(null)
  }

  const handleEdit = (sermon: Sermon) => {
    setEditingSermon(sermon)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sermão?')) return

    const { error } = await supabase.from('sermons').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir sermão')
      return
    }

    toast.success('Sermão excluído com sucesso!')
    loadSermons()
  }

  const filteredSermons = sermons.filter((sermon) => {
    const matchesSearch = sermon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sermon.speaker.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || sermon.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(sermons.map((s) => s.category).filter(Boolean)))]

  // Guest vê apenas 3 sermões
  const visibleSermons = isGuest ? filteredSermons.slice(0, 3) : filteredSermons

  if (loading) {
    return (
      <Layout title="Sermões">
        <LoadingState fullScreen message="Carregando sermões..." />
      </Layout>
    )
  }

  return (
    <Layout title="Sermões">
      <div className="space-y-6">
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop&q=80"
              alt="Bible Study"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700/96 via-cyan-700/94 to-teal-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE SERMÕES' : 'BIBLIOTECA DE SERMÕES'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      A{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Palavra Viva
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Descubra mensagens transformadoras que trazem esperança, fé e propósito para sua vida.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Palavra Compartilhada
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Reviva momentos poderosos da Palavra. Cresça, reflita e compartilhe com sua comunidade.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Gerenciar Sermões
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Publique, edite e organize a Palavra pregada. Acompanhe impacto e engajamento.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isAdmin && (
                  <AdminAction>
                    <Button
                      onClick={() => { setEditingSermon(null); setEditorOpen(true); }}
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Adicionar Sermão
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/about')}
                    className="bg-white text-blue-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Acesso Completo
                  </Button>
                )}
                {!isGuest && filteredSermons.length > 0 && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {filteredSermons.length} Sermões
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Search & Filter - Apenas para Member/Admin */}
        {!isGuest && (
          <Card className="p-5 md:p-6 border-2 elevation-1">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por tema ou pregador..."
                  className="pl-11 h-12 border-2 focus:border-primary"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 font-semibold"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                {categories.slice(0, 4).map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat)}
                    className="capitalize font-semibold border-2"
                    size="sm"
                  >
                    {cat === 'all' ? 'Todos' : cat}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Featured Sermon (Most Recent) */}
        {visibleSermons.length > 0 && (
          <Card className="relative overflow-hidden border-0 shadow-xl elevation-3">
            <div className="absolute inset-0">
              <img
                src={visibleSermons[0].thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop'}
                alt={visibleSermons[0].title}
                className="w-full h-full object-cover opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40" />
            </div>

            <div className="relative z-10 p-6 md:p-10 lg:p-12 text-white">
              <div className="max-w-3xl space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-primary to-secondary rounded-full shadow-lg">
                  <Star className="h-4 w-4" />
                  <span className="text-sm font-bold">{isGuest ? 'MENSAGEM RECENTE' : 'MAIS RECENTE'}</span>
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
                    {visibleSermons[0].title}
                  </h2>
                  {visibleSermons[0].description && (
                    <p className="text-base md:text-lg text-white/90 leading-relaxed max-w-2xl">
                      {visibleSermons[0].description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 text-sm md:text-base">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/15 backdrop-blur-sm rounded-lg">
                      <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <span className="font-bold">{visibleSermons[0].speaker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/15 backdrop-blur-sm rounded-lg">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                    <span className="font-bold">
                      {new Date(visibleSermons[0].date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  {!isGuest && (
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/15 backdrop-blur-sm rounded-lg">
                        <Eye className="h-4 w-4 md:h-5 md:w-5" />
                      </div>
                      <span className="font-bold">{visibleSermons[0].views} visualizações</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {!isGuest ? (
                    <Button size="lg" 
                        className="bg-white text-primary hover:bg-white/95 font-bold shadow-xl"
                        onClick={() => visibleSermons[0]?.videoUrl ? window.open(visibleSermons[0].videoUrl, '_blank') : toast.info('Vídeo não disponível para este sermão')}
                      >
                      <Play className="mr-2 h-5 w-5" />
                      Assistir Agora
                    </Button>
                  ) : (
                    <Button onClick={() => navigate('/about')} size="lg" className="bg-white text-primary hover:bg-white/95 font-bold shadow-xl">
                      <UserPlus className="mr-2 h-5 w-5" />
                      Tornar-se Membro para Assistir
                    </Button>
                  )}
                  {isAdmin && (
                    <AdminAction>
                      <Button size="lg" variant="outline" onClick={() => handleEdit(visibleSermons[0])} className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 font-bold">
                        <Edit2 className="h-5 w-5 mr-2" />
                        Editar
                      </Button>
                    </AdminAction>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sermons Grid */}
        {visibleSermons.length > 1 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-md">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                {isGuest ? 'Mensagens Disponíveis' : isAdmin ? 'Todos os Sermões' : 'Biblioteca Completa'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleSermons.slice(1).map((sermon) => (
                <Card key={sermon.id} className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl elevation-1">
                  <div className="relative h-48">
                    <img
                      src={sermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop'}
                      alt={sermon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <div className="p-4 bg-white/20 backdrop-blur-md rounded-full transform group-hover:scale-110 transition-transform">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                    </div>

                    {sermon.category && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-primary/90 backdrop-blur-sm rounded-full text-white text-xs font-bold shadow-lg">
                        {sermon.category}
                      </div>
                    )}

                    {!isGuest && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded-full text-white text-xs font-bold">
                        <Eye className="h-3 w-3" />
                        {sermon.views}
                      </div>
                    )}

                    {isAdmin && (
                      <AdminAction>
                        <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary" onClick={() => handleEdit(sermon)} className="h-8 w-8 p-0 backdrop-blur-md">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(sermon.id)} className="h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </AdminAction>
                    )}
                  </div>

                  <div className="p-5 md:p-6 space-y-3">
                    <h3 className="font-bold text-lg md:text-xl text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {sermon.title}
                    </h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold">{sermon.speaker}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="p-1.5 bg-muted rounded-lg">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <span className="font-medium">
                          {new Date(sermon.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {!isGuest ? (
                      <Button 
                        className="w-full gradient-primary text-white font-semibold"
                        onClick={() => sermon.videoUrl ? window.open(sermon.videoUrl, '_blank') : toast.info('Vídeo não disponível para este sermão')}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Assistir
                      </Button>
                    ) : (
                      <Button onClick={() => navigate('/about')} className="w-full gradient-primary text-white font-semibold">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Acessar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && sermons.length > 3 && (
          <GuestPrompt
            title="Acesse toda a biblioteca de sermões"
            description={`Mais de ${sermons.length - 3} sermões disponíveis para membros. Cresça na Palavra e fortaleça sua fé.`}
            actionLabel="Tornar-se Membro"
            onAction={() => navigate('/about')}
          />
        )}

        {/* Empty State */}
        {sermons.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={isAdmin ? 'Nenhum sermão publicado' : 'Nenhum sermão disponível'}
            description={isAdmin ? 'Adicione o primeiro sermão à biblioteca' : 'Novos sermões serão publicados em breve'}
            action={
              isAdmin ? (
                <AdminAction>
                  <Button onClick={() => { setEditingSermon(null); setEditorOpen(true); }} className="gradient-primary text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Primeiro Sermão
                  </Button>
                </AdminAction>
              ) : undefined
            }
          />
        )}
      </div>

      <SermonEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        sermon={editingSermon}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default SermonsPage
