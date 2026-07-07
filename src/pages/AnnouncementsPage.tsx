import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Megaphone, Pin, Trash2, Edit2, Plus, Flame, Clock, User, Share2,
  Sparkles, ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Announcement } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AnnouncementEditor } from '../components/admin/AnnouncementEditor'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const categoryStyles: Record<string, string> = {
  urgent:        'bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-transparent',
  spiritual:     'bg-indigo-50 text-indigo-700 border-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-transparent',
  event:         'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-transparent',
  institutional: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-transparent',
}

const categoryLabels: Record<string, string> = {
  urgent: 'Urgente', spiritual: 'Espiritual', event: 'Evento', institutional: 'Institucional',
}

const TABS = [
  { id: 'all',           label: 'Todos' },
  { id: 'urgent',        label: 'Urgentes' },
  { id: 'spiritual',     label: 'Espiritual' },
  { id: 'event',         label: 'Eventos' },
  { id: 'institutional', label: 'Institucional' },
] as const

type TabId = typeof TABS[number]['id']

const AnnouncementsPage = () => {
  const navigate  = useNavigate()
  const { user }  = useAuth()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [submittingId, setSubmittingId]   = useState<string | null>(null)
  const [activeTab, setActiveTab]         = useState<TabId>('all')
  const [editorOpen, setEditorOpen]       = useState(false)
  const [editingItem, setEditingItem]     = useState<Announcement | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadAnnouncements = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading announcements:', error)
      toast.error('Não foi possível carregar os anúncios')
      return
    }

    // Normalise image_url → imageUrl
    const normalised = (data || []).map((a: any) => ({
      ...a,
      imageUrl: a.image_url,
    })) as Announcement[]

    setAnnouncements(normalised)
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      setLoading(true)
      await loadAnnouncements()
      if (mounted) setLoading(false)
    }

    init()

    const channel = supabase
      .channel('announcements:realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        if (!mounted) return
        setAnnouncements(prev => {
          if (payload.eventType === 'INSERT')
            return [{ ...(payload.new as any), imageUrl: payload.new.image_url }, ...prev]
          if (payload.eventType === 'UPDATE')
            return prev.map(a => a.id === payload.new.id ? { ...(payload.new as any), imageUrl: payload.new.image_url } : a)
          if (payload.eventType === 'DELETE')
            return prev.filter(a => a.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [loadAnnouncements])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleTogglePin = async (item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin) { toast.error('Acesso negado'); return }
    setSubmittingId(item.id)
    const { error } = await supabase
      .from('announcements')
      .update({ is_pinned: !item.is_pinned })
      .eq('id', item.id)
    if (error) toast.error('Erro ao alterar destaque')
    else toast.success(item.is_pinned ? 'Anúncio desafixado' : 'Anúncio fixado no topo!')
    setSubmittingId(null)
  }

  const handleEdit = (item: Announcement, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingItem(item)
    setEditorOpen(true)
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin) { toast.error('Acesso negado'); return }
    toast('Excluir anúncio permanentemente?', {
      action: {
        label: 'Excluir',
        onClick: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id)
          if (error) toast.error('Erro ao excluir')
          else toast.success('Comunicado removido!')
        },
      },
    })
  }

  const handleEditorSuccess = () => {
    loadAnnouncements()
    setEditingItem(null)
    setEditorOpen(false)
  }

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/announcements/${id}`)
    toast.success('Link copiado!')
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Layout title="Anúncios">
        <LoadingState fullScreen message="Carregando anúncios..." />
      </Layout>
    )
  }

  const sorted = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const pinned  = activeTab === 'all' ? sorted.find(a => a.is_pinned) || sorted[0] : null
  const filtered = activeTab === 'all'
    ? sorted.filter(a => !pinned || a.id !== pinned.id)
    : sorted.filter(a => a.category === activeTab)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout title="Anúncios">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Mural de Anúncios
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {announcements.length} {announcements.length === 1 ? 'comunicado' : 'comunicados'} ·{' '}
              {announcements.filter(a => a.is_pinned).length} fixados
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                onClick={() => { setEditingItem(null); setEditorOpen(true) }}
                className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />Criar Anúncio
              </Button>
            )}
            {isGuest && (
              <Button onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-medium shadow-sm">
                <User className="h-4 w-4 mr-2" />Entrar na Comunidade
              </Button>
            )}
          </div>
        </div>

        {/* ── Hero Banner ── */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl hidden md:block group">
          <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
            <img
              src="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1920&h=600&fit=crop&q=80"
              alt="Announcements Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-indigo-950/90" />
          </div>
          <div className="relative z-10 p-8 md:p-12 text-white">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <Megaphone className="h-4 w-4 text-indigo-300" />
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
                  {isAdmin ? 'Painel Administrativo' : 'Canal Oficial de Notícias'}
                </span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                {isAdmin ? 'Publique Avisos Oficiais' : 'Fique por Dentro de Tudo'}
              </h2>
              <p className="text-base md:text-lg text-slate-200/90 leading-relaxed max-w-2xl">
                {isAdmin
                  ? 'Transmita diretrizes, alertas urgentes e atualizações pastorais diretamente no feed em tempo real.'
                  : 'Acompanhe comunicados importantes, notas administrativas e direcionamentos espirituais da liderança.'}
              </p>
              {isAdmin && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-amber-300">
                    <ShieldCheck className="h-4 w-4 text-amber-400" />
                    Modo Administrador Ativo
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Pinned / Featured ── */}
        {pinned && activeTab === 'all' && (
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500 animate-pulse" /> Comunicado em Destaque
            </span>
            <Card className="p-5 md:p-6 border border-indigo-500/20 shadow-md hover:shadow-lg transition-all rounded-2xl">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative w-full md:w-56 h-44 rounded-xl overflow-hidden flex-shrink-0 bg-muted shadow-inner">
                  <img
                    src={pinned.imageUrl || pinned.image_url || 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&h=400&fit=crop'}
                    alt={pinned.title}
                    className="w-full h-full object-cover"
                  />
                  {pinned.is_pinned && (
                    <div className="absolute top-2 left-2 px-2.5 py-1 bg-amber-500 rounded-lg text-white text-[10px] font-black tracking-wider shadow inline-flex items-center gap-1">
                      <Pin className="h-3 w-3 fill-white" /> FIXADO
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border uppercase ${categoryStyles[pinned.category] || ''}`}>
                      {categoryLabels[pinned.category] || pinned.category}
                    </span>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{pinned.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{pinned.content}</p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 border-t border-b border-border/50 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">
                        {new Date(pinned.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    {pinned.author_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium text-foreground">Por: {pinned.author_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Button
                          onClick={(e) => handleTogglePin(pinned, e)}
                          disabled={submittingId === pinned.id}
                          variant="outline"
                          size="sm"
                          className="font-semibold"
                        >
                          <Pin className="mr-1.5 h-3.5 w-3.5" />
                          {pinned.is_pinned ? 'Desafixar' : 'Fixar'}
                        </Button>
                      )}
                      <Button
                        onClick={() => copyLink(pinned.id)}
                        size="sm"
                        variant="outline"
                        className="font-semibold"
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1.5" />Partilhar
                      </Button>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={(e) => handleEdit(pinned, e)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={(e) => handleDelete(pinned.id, e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="space-y-6">
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-xl w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}{' '}
                ({tab.id === 'all'
                  ? announcements.length
                  : announcements.filter(a => a.category === tab.id).length})
              </button>
            ))}
          </div>

          {/* ── Grid ── */}
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(item => (
                <Card
                  key={item.id}
                  className="group flex flex-col h-full overflow-hidden border border-border bg-card hover:border-primary/40 transition-all hover:shadow-md rounded-2xl"
                >
                  <div className="relative h-44 bg-muted overflow-hidden">
                    <img
                      src={item.imageUrl || item.image_url || 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&h=400&fit=crop'}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[11px] font-bold text-white uppercase">
                      {categoryLabels[item.category] || item.category}
                    </div>
                    {item.is_pinned && (
                      <div className="absolute top-3 left-3 px-2 py-0.5 bg-amber-500 rounded-md text-[10px] font-black text-white inline-flex items-center gap-1">
                        <Pin className="h-2.5 w-2.5 fill-white" /> Fixado
                      </div>
                    )}
                    {isAdmin && (
                      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={(e) => handleTogglePin(item, e)} className={`h-7 w-7 p-0 bg-black/50 ${item.is_pinned ? 'text-amber-400' : 'text-white'} hover:bg-black/70`}>
                          <Pin className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => handleEdit(item, e)} className="h-7 w-7 p-0 bg-black/50 text-white hover:bg-black/70">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={(e) => handleDelete(item.id, e)} className="h-7 w-7 p-0 bg-black/50 text-red-400 hover:bg-red-500/50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border/60 pt-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-medium text-foreground">
                          {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {item.author_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-primary/70" />
                          <span className="font-medium text-foreground truncate">Por: {item.author_name}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={() => copyLink(item.id)}
                      size="sm"
                      variant="outline"
                      className="w-full font-semibold"
                    >
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />Partilhar Aviso
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Megaphone}
              title="Mural limpo por enquanto"
              description="Nenhum comunicado foi publicado nesta categoria."
            />
          )}
        </div>

        {/* ── Guest CTA ── */}
        {isGuest && announcements.length > 0 && (
          <GuestPrompt
            title="Mantenha-se alinhado"
            description="Crie seu perfil de membro para receber notificações de novos comunicados críticos."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* ── Announcement Editor Modal ── */}
      <AnnouncementEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        announcement={editingItem}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default AnnouncementsPage
