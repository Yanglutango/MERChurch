import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  BookOpen,
  Search,
  Play,
  Eye,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Star,
  UserPlus,
  BadgeCheck,
  Mic,
  Sparkles,
  Headphones,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Sermon } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { SermonEditor } from '../components/admin/SermonEditor'

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
      setLoading(false)
      return
    }

    setSermons(data || [])
    setLoading(false)
  }

  const handleEdit = (sermon: Sermon) => {
    setEditingSermon(sermon)
    setEditorOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteSermonId) return

    const { error } = await supabase.from('sermons').delete().eq('id', deleteSermonId)
    setDeleteSermonId(null)

    if (error) {
      toast.error('Erro ao excluir')
      return
    }

    setSermons(prev => prev.filter(p => p.id !== deleteSermonId))
    toast.success('Sermão excluído!')
    loadSermons()
  }

  const filteredSermons = sermons.filter(s => {
    const q = searchTerm.toLowerCase()
    const matchSearch =
      s.title.toLowerCase().includes(q) ||
      s.speaker.toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)

    const matchCat = selectedCategory === 'all' || s.category === selectedCategory
    return matchSearch && matchCat
  })

  const visibleSermons = isGuest ? filteredSermons.slice(0, 3) : filteredSermons
  const featuredSermon = visibleSermons[0]

  if (loading) {
    return (
      <Layout title="Sermões">
        <LoadingState fullScreen message="Carregando sermões..." />
      </Layout>
    )
  }

  return (
    <Layout title="Sermões">
      <div className="min-h-screen bg-[#f5f7f8] text-slate-900 dark:bg-[#07111c] dark:text-slate-50">
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
          <Card className="relative overflow-hidden border-0 rounded-[30px] bg-slate-950 shadow-[0_25px_80px_rgba(15,23,42,0.18)]">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop&q=80"
                alt="Sermões"
                className="h-full w-full object-cover opacity-35"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(130,166,194,0.35),transparent_22%),linear-gradient(120deg,rgba(6,12,21,0.96),rgba(10,46,74,0.92),rgba(19,58,78,0.9))]" />
            </div>

            <div className="relative z-10 p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-100 backdrop-blur-sm">
                    <Mic className="h-4 w-4 text-[#d7b47a]" />
                    Biblioteca de mensagens
                  </div>

                  <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-[-0.06em] text-white md:text-5xl">
                      Palavra viva para a <span className="text-[#d8b07a]">vida inteira</span>
                    </h1>
                    <p className="max-w-xl text-base text-slate-200 md:text-lg">
                      Mensagens de fé, discipulado e encorajamento para alimentar a alma, fortalecer a igreja e inspirar a caminhada diária.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {isAdmin && (
                    <Button
                      size="lg"
                      onClick={() => {
                        setEditingSermon(null)
                        setEditorOpen(true)
                      }}
                      className="h-12 rounded-full bg-[#d8b07a] px-6 text-sm font-bold text-slate-900 shadow-[0_18px_35px_rgba(216,176,122,0.35)] hover:bg-[#efc98a]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo sermão
                    </Button>
                  )}

                  {isGuest && (
                    <Button
                      size="lg"
                      onClick={() => navigate('/about')}
                      className="h-12 rounded-full bg-white px-6 text-sm font-bold text-slate-900 hover:bg-slate-100"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Acesso completo
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {!isGuest && (
            <Card className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por tema, pregador ou palavra-chave..."
                    className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`rounded-full border px-3.5 py-2 text-xs font-bold transition-all ${
                      selectedCategory === 'all'
                        ? 'border-[#0A2E4A] bg-[#0A2E4A] text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    Todos
                  </button>

                  {SERMON_CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all ${
                        selectedCategory === cat.value
                          ? 'border-[#0A2E4A] bg-[#0A2E4A] text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {featuredSermon && (
            <Card className="relative overflow-hidden border-0 rounded-[30px] shadow-[0_26px_70px_rgba(15,23,42,0.18)]">
              <div className="absolute inset-0">
                <img
                  src={featuredSermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1400&h=800&fit=crop&q=80'}
                  alt={featuredSermon.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/45" />
              </div>

              <div className="relative z-10 p-5 md:p-8 lg:p-10">
                <div className="max-w-3xl space-y-5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#d8b07a] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-900">
                    <Star className="h-3.5 w-3.5" />
                    Destaque
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-2xl font-black tracking-[-0.06em] text-white md:text-4xl lg:text-5xl">
                      {featuredSermon.title}
                    </h2>

                    {featuredSermon.description && (
                      <p className="max-w-2xl text-sm text-slate-200 md:text-base">
                        {featuredSermon.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-200">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-[#d8b07a]" />
                      <span className="font-semibold">{featuredSermon.speaker}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#d8b07a]" />
                      <span>
                        {new Date(featuredSermon.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {!isGuest && (
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-[#d8b07a]" />
                        <span>{featuredSermon.views} visualizações</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {!isGuest ? (
                      <Button
                        size="lg"
                        className="h-11 rounded-full bg-white px-6 text-sm font-bold text-slate-900 hover:bg-slate-100"
                        onClick={() =>
                          featuredSermon.videoUrl
                            ? window.open(featuredSermon.videoUrl, '_blank')
                            : toast.info('Vídeo não disponível')
                        }
                      >
                        <Play className="mr-2 h-4 w-4 fill-current" />
                        Assistir mensagem
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="h-11 rounded-full bg-white px-6 text-sm font-bold text-slate-900 hover:bg-slate-100"
                        onClick={() => navigate('/about')}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Tornar-se membro
                      </Button>
                    )}

                    {isAdmin && (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => handleEdit(featuredSermon)}
                        className="h-11 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-bold text-white hover:bg-white/15"
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {visibleSermons.length > 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf3fa] text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <h3 className="text-lg font-black tracking-[-0.04em] text-slate-900 dark:text-white">
                    Mais mensagens
                  </h3>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  {visibleSermons.length} disponíveis
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleSermons.slice(1).map(sermon => (
                  <Card
                    key={sermon.id}
                    className="group overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={sermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800&h=600&fit=crop&q=80'}
                        alt={sermon.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                      {sermon.category && (
                        <div className="absolute right-3 top-3 rounded-full border border-white/15 bg-slate-950/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
                          {getCategoryLabel(sermon.category)}
                        </div>
                      )}

                      {!isGuest && (
                        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
                          <Eye className="h-3 w-3" />
                          {sermon.views}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="absolute left-3 top-3 flex gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(sermon)}
                            className="h-8 w-8 rounded-full border border-white/20 bg-white/80 p-0 text-slate-900 shadow-sm hover:bg-white"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteSermonId(sermon.id)}
                            className="h-8 w-8 rounded-full p-0 shadow-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                        {new Date(sermon.date).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>

                      <h3 className="line-clamp-2 text-base font-black leading-tight tracking-[-0.04em] text-slate-900 transition-colors group-hover:text-[#0A2E4A] dark:text-white dark:group-hover:text-[#d8b07a]">
                        {sermon.title}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{sermon.speaker}</span>
                      </div>

                      {sermon.description && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                          {sermon.description}
                        </p>
                      )}

                      {!isGuest ? (
                        <Button
                          size="sm"
                          className="mt-2 h-10 w-full rounded-full bg-[#0A2E4A] text-sm font-bold text-white hover:bg-[#0d3a5c]"
                          onClick={() =>
                            sermon.videoUrl
                              ? window.open(sermon.videoUrl, '_blank')
                              : toast.info('Vídeo não disponível')
                          }
                        >
                          <Play className="mr-2 h-3.5 w-3.5 fill-current" />
                          Assistir
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="mt-2 h-10 w-full rounded-full bg-[#0A2E4A] text-sm font-bold text-white hover:bg-[#0d3a5c]"
                          onClick={() => navigate('/about')}
                        >
                          <UserPlus className="mr-2 h-3.5 w-3.5" />
                          Acessar
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isGuest && sermons.length > 3 && (
            <GuestPrompt
              title="Acesse toda a biblioteca de sermões"
              description={`Mais de ${sermons.length - 3} mensagens disponíveis para membros.`}
              actionLabel="Tornar-se membro"
              onAction={() => navigate('/about')}
            />
          )}

          {sermons.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title={isAdmin ? 'Nenhum sermão publicado' : 'Nenhum sermão disponível'}
              description={isAdmin ? 'Adicione o primeiro sermão à biblioteca' : 'Novos sermões serão publicados em breve'}
              action={
                isAdmin ? (
                  <Button
                    onClick={() => {
                      setEditingSermon(null)
                      setEditorOpen(true)
                    }}
                    className="bg-[#0A2E4A] text-white hover:bg-[#0d3a5c]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar sermão
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      <SermonEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        sermon={editingSermon}
        onSuccess={() => {
          loadSermons()
          setEditingSermon(null)
        }}
      />

      <AlertDialog open={!!deleteSermonId} onOpenChange={open => { if (!open) setDeleteSermonId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover sermão?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default SermonsPage
