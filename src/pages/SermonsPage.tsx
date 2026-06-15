import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { BookOpen, Search, Play, Eye, Calendar, Plus, Edit2, Trash2, Star, UserPlus, Download } from 'lucide-react'
import { toast } from 'sonner'
import type { Sermon } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { SermonEditor } from '../components/admin/SermonEditor'

// Closed category list to prevent normalization drift
const SERMON_CATEGORIES = [
  { value: 'evangelismo', label: 'Evangelismo' },
  { value: 'adoracao', label: 'Adoração' },
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'familia', label: 'Família' },
  { value: 'fe', label: 'Fé' },
  { value: 'cura', label: 'Cura' },
  { value: 'profecia', label: 'Profecia' },
  { value: 'missoes', label: 'Missões' },
]

const getCategoryLabel = (cat: string | null | undefined) =>
  SERMON_CATEGORIES.find(c => c.value === cat)?.label || cat || 'Geral'

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
  const [deleteSermonId, setDeleteSermonId] = useState<string | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => { loadSermons() }, [])

  const loadSermons = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('sermons').select('*').order('date', { ascending: false })
    if (error) { setLoading(false); return }
    setSermons(data)
    setLoading(false)
  }

  const handleEdit = (sermon: Sermon) => { setEditingSermon(sermon); setEditorOpen(true) }

  const handleDelete = async () => {
    if (!deleteSermonId) return
    const { error } = await supabase.from('sermons').delete().eq('id', deleteSermonId)
    setDeleteSermonId(null)
    if (error) { toast.error('Erro ao excluir'); return }
    setSermons(prev => prev.filter(p => p.id !== deleteSermonId))
    toast.success('Sermão excluído!')
    loadSermons()  
  }

  const filteredSermons = sermons.filter(s => {
    const q = searchTerm.toLowerCase()
    const matchSearch = s.title.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q)
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory
    return matchSearch && matchCat
  })

  const visibleSermons = isGuest ? filteredSermons.slice(0, 3) : filteredSermons
  const featuredSermon = visibleSermons[0]

  if (loading) return <Layout title="Sermões"><LoadingState fullScreen message="Carregando sermões..." /></Layout>

  return (
    <Layout title="Sermões">
      <div className="p-4 space-y-5">
        {/* ── Compact page header ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Sermões</h1>
            <p className="text-sm text-muted-foreground">{sermons.length} mensagens na biblioteca</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => { setEditingSermon(null); setEditorOpen(true) }}
              className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />Adicionar
            </Button>
          )}
          {isGuest && (
            <Button size="sm" onClick={() => navigate('/about')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
              <UserPlus className="h-4 w-4 mr-1.5" />Acesso Completo
            </Button>
          )}
        </div>

        {/* ── Search & Filter ─────────────────────────────────────────── */}
        {!isGuest && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por tema ou pregador..."
                className="pl-9 h-10"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedCategory === 'all' ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
              >
                Todos
              </button>
              {SERMON_CATEGORIES.slice(0, 5).map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selectedCategory === cat.value ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Featured Sermon (most recent) — serves as visual anchor ── */}
        {featuredSermon && (
          <Card className="relative overflow-hidden border shadow-lg">
            <div className="absolute inset-0">
              <img
                src={featuredSermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop&q=80'}
                alt={featuredSermon.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40" />
            </div>

            <div className="relative z-10 p-5 md:p-8 text-white">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-[#0A2E4A] to-[#4A90A4] rounded-full text-xs font-bold">
                  <Star className="h-3 w-3" />
                  MAIS RECENTE
                </div>

                <h2 className="text-2xl md:text-3xl font-bold leading-tight">{featuredSermon.title}</h2>

                {featuredSermon.description && (
                  <p className="text-sm text-white/80 line-clamp-2 leading-relaxed">{featuredSermon.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-[#4A90A4]" />
                    <span className="font-semibold">{featuredSermon.speaker}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-[#4A90A4]" />
                    <span>{new Date(featuredSermon.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  {!isGuest && (
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-[#4A90A4]" />
                      <span>{featuredSermon.views} visualizações</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  {!isGuest ? (
                    <Button size="sm" className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold"
                      onClick={() => featuredSermon.videoUrl ? window.open(featuredSermon.videoUrl, '_blank') : toast.info('Vídeo não disponível')}>
                      <Play className="mr-1.5 h-4 w-4 fill-current" />Assistir
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => navigate('/about')} className="bg-white text-[#0A2E4A] hover:bg-white/90 font-bold">
                      <UserPlus className="mr-1.5 h-4 w-4" />Tornar-se Membro
                    </Button>
                  )}
                  {isAdmin && (
                    <Button size="sm" variant="outline" onClick={() => handleEdit(featuredSermon)}
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-bold">
                      <Edit2 className="h-4 w-4 mr-1.5" />Editar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── Sermons Grid ─────────────────────────────────────────────── */}
        {visibleSermons.length > 1 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleSermons.slice(1).map(sermon => (
              <Card key={sermon.id} className="group overflow-hidden border hover:border-primary/50 transition-all hover:shadow-md">
                <div className="relative h-40">
                  <img
                    src={sermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop&q=80'}
                    alt={sermon.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />

                  {sermon.category && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#0A2E4A]/90 text-white text-[10px] font-bold rounded-full">
                      {getCategoryLabel(sermon.category)}
                    </div>
                  )}

                  {!isGuest && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 rounded-full text-white text-[10px]">
                      <Eye className="h-2.5 w-2.5" />{sermon.views}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" onClick={() => handleEdit(sermon)} className="h-7 w-7 p-0 backdrop-blur-md">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteSermonId(sermon.id)} className="h-7 w-7 p-0">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="font-bold text-sm md:text-base text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {sermon.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{sermon.speaker}</span>
                    <span>·</span>
                    <span>{new Date(sermon.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                  </div>

                  {!isGuest ? (
                    <Button size="sm" className="w-full bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold"
                      onClick={() => sermon.videoUrl ? window.open(sermon.videoUrl, '_blank') : toast.info('Vídeo não disponível')}>
                      <Play className="mr-1.5 h-3.5 w-3.5" />Assistir
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold" onClick={() => navigate('/about')}>
                      <UserPlus className="mr-1.5 h-3.5 w-3.5" />Acessar
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Guest prompt */}
        {isGuest && sermons.length > 3 && (
          <GuestPrompt
            title="Acesse toda a biblioteca de sermões"
            description={`Mais de ${sermons.length - 3} mensagens disponíveis para membros.`}
            actionLabel="Tornar-se Membro"
            onAction={() => navigate('/about')}
          />
        )}

        {/* Empty state */}
        {sermons.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title={isAdmin ? 'Nenhum sermão publicado' : 'Nenhum sermão disponível'}
            description={isAdmin ? 'Adicione o primeiro sermão à biblioteca' : 'Novos sermões serão publicados em breve'}
            action={isAdmin ? (
              <Button onClick={() => { setEditingSermon(null); setEditorOpen(true) }} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                <Plus className="mr-2 h-4 w-4" />Adicionar Sermão
              </Button>
            ) : undefined}
          />
        )}
      </div>

      <SermonEditor open={editorOpen} onOpenChange={setEditorOpen} sermon={editingSermon} onSuccess={() => { loadSermons(); setEditingSermon(null) }} />
          <AlertDialog open={!!deleteSermonId} onOpenChange={open => { if (!open) setDeleteSermonId(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remover sermão?</AlertDialogTitle>
      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
        Remover
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </Layout>
  )
}

export default SermonsPage
