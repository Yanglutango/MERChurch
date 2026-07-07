import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activityLogger'
import {
  Users, Plus, UserPlus, Save, Users2, Search, Loader2, Image as ImageIcon,
  ShieldAlert, Calendar, Info, Tag, Crown, HandHeart, Activity, Shield,
  Clock, ChevronRight, Star, BookOpen, Music, Mic, Heart, Palette, Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { MinistryCard } from '../components/ministries/MinistryCard'

const NAME_MAX = 60
const DESCRIPTION_MAX = 300
const HEX_REGEX = /^#([0-9A-Fa-f]{6})$/
const MAX_MINISTRIES = 3

const COLOR_PRESETS = [
  '#0A2E4A', '#4A90A4', '#D4A574', '#16A34A',
  '#DC2626', '#9333EA', '#EA580C', '#0EA5E9',
]

const MINISTRY_ICONS: Record<string, any> = {
  'louvor': Music,
  'música': Music,
  'comunicação': Globe,
  'mídia': Globe,
  'jovens': Star,
  'crianças': Heart,
  'oração': HandHeart,
  'discipulado': BookOpen,
  'louvor e adoração': Music,
  'evangelismo': Globe,
  'cuidado': Heart,
  'artes': Palette,
  'pregação': Mic,
}

const getMinistryIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, Icon] of Object.entries(MINISTRY_ICONS)) {
    if (lower.includes(key)) return Icon
  }
  return Users
}

const EMPTY_FORM = { name: '', description: '', color: '#4A90A4', activities: '', imageUrl: '', leaderId: '' }

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ministries, setMinistries] = useState<any[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [newMinistry, setNewMinistry] = useState(EMPTY_FORM)
  const [colorError, setColorError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingJoinIds, setPendingJoinIds] = useState<string[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMine, setFilterMine] = useState(false)
  const [selectedMinistryForDetails, setSelectedMinistryForDetails] = useState<any | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load ministries
      const { data: ministriesData, error: ministriesError } = await supabase
        .from('ministries')
        .select(`
          *,
          leader:user_profiles!ministries_leader_id_fkey(username, avatar_url),
          ministry_members(user_id, user_profiles(username, avatar_url))
        `)
        .order('created_at', { ascending: false })

      if (ministriesError) {
        console.error('Error loading ministries:', ministriesError)
        toast.error('Erro ao carregar ministérios')
        setLoading(false)
        return
      }

      const formatted = (ministriesData || []).map((m: any) => ({
        ...m,
        memberCount: m.ministry_members ? m.ministry_members.length : 0,
        membersList: m.ministry_members || [],
        imageUrl: m.image_url,
        leaderId: m.leader_id,
      }))
      setMinistries(formatted)

      // Update detail modal if open
      setSelectedMinistryForDetails((prev: any) => {
        if (!prev) return null
        const updated = formatted.find((m: any) => m.id === prev.id)
        return updated || prev
      })
    } catch (err) {
      console.error('Unexpected error loading ministries:', err)
      toast.error('Erro inesperado ao carregar ministérios')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadJoinedMinistries = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('ministry_members')
        .select('ministry_id')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error loading joined ministries:', error)
        return
      }
      setJoinedMinistries(data?.map((m: any) => m.ministry_id) || [])
    } catch (err) {
      console.error('Unexpected error loading joined ministries:', err)
    }
  }, [user?.id])

  const loadProfiles = useCallback(async () => {
    if (!isAdmin) return
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .order('username', { ascending: true })

      if (error) { console.error('Error loading profiles:', error); return }
      setProfiles(data || [])
    } catch (err) {
      console.error('Unexpected error loading profiles:', err)
    }
  }, [isAdmin])

  useEffect(() => {
    loadData()
    if (!isGuest && user?.id) loadJoinedMinistries()
    if (isAdmin) loadProfiles()
  }, [user?.id, isGuest, isAdmin])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingMinistry(null)
    setNewMinistry(EMPTY_FORM)
    setColorError(null)
  }, [])

  const openCreate = useCallback(() => {
    setEditingMinistry(null)
    setNewMinistry(EMPTY_FORM)
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((m: Ministry) => {
    setEditingMinistry(m)
    setNewMinistry({
      name: m.name,
      description: m.description || '',
      color: m.color || '#4A90A4',
      activities: (m as any).activities || '',
      imageUrl: (m as any).imageUrl || m.image_url || '',
      leaderId: (m as any).leaderId || m.leader_id || '',
    })
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const canManage = useCallback((m: any) => isAdmin || (m.leaderId || m.leader_id) === user?.id, [isAdmin, user?.id])

  const createOrUpdate = async () => {
    if (!newMinistry.name.trim()) { toast.error('Nome é obrigatório'); return }
    if (!newMinistry.leaderId) { toast.error('É obrigatório definir um líder para o ministério'); return }
    if (!HEX_REGEX.test(newMinistry.color)) { setColorError('Use um código hexadecimal válido, ex: #4A90A4'); return }

    setSaving(true)
    try {
      const payload = {
        name: newMinistry.name.trim(),
        description: newMinistry.description.trim() || null,
        color: newMinistry.color,
        activities: newMinistry.activities.trim() || null,
        image_url: newMinistry.imageUrl.trim() || null,
        leader_id: newMinistry.leaderId,
      }

      if (editingMinistry) {
        if (!isAdmin) { toast.error('Apenas o Administrador pode redefinir lideranças'); setSaving(false); return }
        const { error } = await supabase.from('ministries').update(payload).eq('id', editingMinistry.id)
        if (error) throw error
        toast.success('Ministério atualizado com sucesso!')
        logActivity({ type: 'ministry_joined', actorId: user!.id, actorName: user!.username, title: newMinistry.name, referenceId: editingMinistry.id, referenceType: 'ministry' }).catch(() => null)
      } else {
        const { error } = await supabase.from('ministries').insert(payload)
        if (error) throw error
        toast.success('Ministério criado com sucesso!')
        logActivity({ type: 'ministry_joined', actorId: user!.id, actorName: user!.username, title: newMinistry.name, referenceType: 'ministry' }).catch(() => null)
      }

      closeEditor()
      await loadData()
    } catch (err: any) {
      console.error('Error creating/updating ministry:', err)
      toast.error(err.message || 'Erro ao processar alteração')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const { data, error } = await supabase.from('ministries').delete().eq('id', deleteTargetId).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Operação negada pela RLS')
      toast.success('Ministério removido!')
      await loadData()
    } catch (err: any) {
      console.error('Error deleting ministry:', err)
      toast.error(err.message || 'Falha ao remover item')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const toggleJoin = useCallback(async (ministryId: string) => {
    // Guards
    if (!user?.id || !user?.username) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }
    if (pendingJoinIds.includes(ministryId)) return

    const isJoined = joinedMinistries.includes(ministryId)

    // Enforce 3-ministry limit
    if (!isJoined && joinedMinistries.length >= MAX_MINISTRIES) {
      toast.error(`Limite atingido! Você já participa de ${MAX_MINISTRIES} ministérios. Saia de um para entrar neste.`)
      return
    }

    // Optimistic update
    setPendingJoinIds(prev => [...prev, ministryId])
    setJoinedMinistries(prev =>
      isJoined ? prev.filter(id => id !== ministryId) : [...prev, ministryId]
    )
    // Also update modal member count optimistically
    setSelectedMinistryForDetails((prev: any) => {
      if (!prev || prev.id !== ministryId) return prev
      return {
        ...prev,
        memberCount: isJoined ? Math.max(0, prev.memberCount - 1) : prev.memberCount + 1,
      }
    })

    try {
      if (isJoined) {
        // LEAVE ministry
        const { error } = await supabase
          .from('ministry_members')
          .delete()
          .eq('ministry_id', ministryId)
          .eq('user_id', user.id)

        if (error) {
          console.error('Leave ministry error:', { message: error.message, code: error.code, details: error.details })
          throw error
        }
        toast.success('Você saiu do ministério')
      } else {
        // JOIN ministry
        const { error } = await supabase
          .from('ministry_members')
          .insert({ ministry_id: ministryId, user_id: user.id })

        if (error) {
          console.error('Join ministry error:', { message: error.message, code: error.code, details: error.details, hint: error.hint })
          throw error
        }
        toast.success('Bem-vindo ao ministério! 🙏')
        // Log activity (fire-and-forget, never block join flow)
        const ministryName = ministries.find(m => m.id === ministryId)?.name || 'Ministério'
        logActivity({
          type: 'ministry_joined',
          actorId: user.id,
          actorName: user.username,
          title: ministryName,
          referenceId: ministryId,
          referenceType: 'ministry',
        }).catch(() => null)
      }

      // Reload data quietly in background to sync member count
      loadData().catch(() => null)
    } catch (err: any) {
      console.error('toggleJoin error:', err)

      // Revert optimistic update
      setJoinedMinistries(prev =>
        isJoined ? [...prev, ministryId] : prev.filter(id => id !== ministryId)
      )
      setSelectedMinistryForDetails((prev: any) => {
        if (!prev || prev.id !== ministryId) return prev
        return {
          ...prev,
          memberCount: isJoined ? prev.memberCount + 1 : Math.max(0, prev.memberCount - 1),
        }
      })

      // User-friendly error messages
      if (err.code === '23505') {
        toast.error('Você já é membro deste ministério')
      } else if (err.code === '42501' || err.status === 403) {
        toast.error('Permissão negada. Verifique as configurações de acesso.')
      } else if (err.status === 401) {
        toast.error('Sua sessão expirou. Faça login novamente.')
      } else if (err.name === 'TypeError' && err.message?.toLowerCase().includes('failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet e tente novamente.')
      } else {
        toast.error(err.message || 'Erro ao processar sua inscrição. Tente novamente.')
      }
    } finally {
      setPendingJoinIds(prev => prev.filter(id => id !== ministryId))
    }
  }, [joinedMinistries, pendingJoinIds, user, ministries, loadData])

  const filteredMinistries = useMemo(() => {
    let list = ministries
    if (filterMine) list = list.filter(m => joinedMinistries.includes(m.id))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        (m as any).activities?.toLowerCase().includes(q)
      )
    }
    return list
  }, [ministries, filterMine, joinedMinistries, searchQuery])

  if (loading) {
    return (
      <Layout title="Ministérios">
        <LoadingState fullScreen message="Sincronizando ministérios..." />
      </Layout>
    )
  }

  return (
    <Layout title="Ministérios">
      <div className="p-4 space-y-6 max-w-7xl mx-auto animate-fade-in">

        {/* ─── Cabeçalho ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Ministérios</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {ministries.length} núcleos · Pode participar de até {MAX_MINISTRIES}
              {!isGuest && joinedMinistries.length > 0 && (
                <span className="ml-1 font-semibold text-foreground">
                  ({joinedMinistries.length}/{MAX_MINISTRIES} usados)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/groups')} className="text-xs font-bold shadow-sm">
              <Users2 className="h-3.5 w-3.5 mr-2" />Grupos de Crescimento
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />Novo Ministério
              </Button>
            )}
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold shadow-sm">
                <UserPlus className="h-4 w-4 mr-1.5" />Criar Conta
              </Button>
            )}
          </div>
        </div>

        {/* ─── Limite visual ─── */}
        {!isGuest && !isAdmin && joinedMinistries.length > 0 && (
          <Card className={`p-3.5 border flex items-center gap-3 ${
            joinedMinistries.length >= MAX_MINISTRIES
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
              : 'bg-muted/30'
          }`}>
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              joinedMinistries.length >= MAX_MINISTRIES ? 'bg-amber-500' : 'bg-[#0A2E4A]'
            }`}>
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {joinedMinistries.length >= MAX_MINISTRIES
                  ? `Limite de ${MAX_MINISTRIES} ministérios atingido`
                  : `${joinedMinistries.length} de ${MAX_MINISTRIES} ministérios`}
              </p>
              <p className="text-xs text-muted-foreground">
                {joinedMinistries.length >= MAX_MINISTRIES
                  ? 'Saia de um ministério para poder entrar em outro'
                  : `Ainda pode entrar em mais ${MAX_MINISTRIES - joinedMinistries.length}`}
              </p>
            </div>
            {/* Progress bar */}
            <div className="w-24 bg-muted rounded-full h-2 flex-shrink-0 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  joinedMinistries.length >= MAX_MINISTRIES ? 'bg-amber-500' : 'bg-[#0A2E4A]'
                }`}
                style={{ width: `${(joinedMinistries.length / MAX_MINISTRIES) * 100}%` }}
              />
            </div>
          </Card>
        )}

        {/* ─── Filtros ─── */}
        {ministries.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome, propósito ou atividade..."
                className="pl-9 h-10"
              />
            </div>
            {!isGuest && (
              <Button
                variant={filterMine ? 'default' : 'outline'}
                onClick={() => setFilterMine(v => !v)}
                className={`h-10 text-xs font-bold ${filterMine ? 'bg-[#0A2E4A] text-white' : ''}`}
              >
                Minhas Atividades ({joinedMinistries.length})
              </Button>
            )}
          </div>
        )}

        {/* ─── Grid principal ─── */}
        {ministries.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isAdmin ? 'Nenhum ministério configurado' : 'Nenhum núcleo operacional ativo'}
            description={isAdmin ? 'Inicie a estrutura inserindo o primeiro ministério do sistema.' : 'Novas frentes de atuação serão listadas em breve.'}
            action={isAdmin ? (
              <Button onClick={openCreate} className="bg-[#0A2E4A] text-white font-bold">
                <Plus className="mr-2 h-4 w-4" />Criar Ministério
              </Button>
            ) : undefined}
          />
        ) : filteredMinistries.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum resultado encontrado"
            description="Modifique os parâmetros ou termos da pesquisa."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMinistries.map(ministry => (
              <MinistryCard
                key={ministry.id}
                ministry={ministry}
                isJoined={joinedMinistries.includes(ministry.id)}
                isPending={pendingJoinIds.includes(ministry.id)}
                isGuest={isGuest}
                canManage={canManage(ministry)}
                isAdmin={isAdmin}
                atLimit={!joinedMinistries.includes(ministry.id) && joinedMinistries.length >= MAX_MINISTRIES}
                onToggleJoin={toggleJoin}
                onEdit={openEdit}
                onDelete={setDeleteTargetId}
                onAuthNavigate={() => navigate('/auth')}
                onViewDetails={setSelectedMinistryForDetails}
              />
            ))}
          </div>
        )}

        {isGuest && ministries.length > 0 && (
          <GuestPrompt
            title="Faça parte da nossa comunidade"
            description="Membros podem se inscrever em até 3 ministérios e acompanhar funções de liderança."
            actionLabel="Cadastrar-se Agora"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* ─── MODAL DE DETALHES DO MINISTÉRIO ─── */}
      <Dialog open={!!selectedMinistryForDetails} onOpenChange={open => { if (!open) setSelectedMinistryForDetails(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 border-2 shadow-2xl">
          {selectedMinistryForDetails && (() => {
            const m = selectedMinistryForDetails
            const MinIcon = getMinistryIcon(m.name)
            const isJoined = joinedMinistries.includes(m.id)
            const isPending = pendingJoinIds.includes(m.id)
            const atLimit = !isJoined && joinedMinistries.length >= MAX_MINISTRIES
            const activities = m.activities ? m.activities.split(',').map((a: string) => a.trim()).filter(Boolean) : []

            return (
              <div>
                {/* Hero Banner */}
                <div
                  className="h-52 md:h-64 relative flex items-end overflow-hidden"
                  style={!m.imageUrl ? { backgroundColor: `${m.color}18` } : undefined}
                >
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-8 rounded-full" style={{ backgroundColor: `${m.color}20` }}>
                        <MinIcon className="h-20 w-20" style={{ color: m.color }} />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                  {/* Overlay info */}
                  <div className="relative z-10 p-6 w-full">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 text-white"
                          style={{ backgroundColor: m.color }}
                        >
                          <MinIcon className="h-3 w-3" />
                          Ministério
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">{m.name}</h2>
                      </div>
                      {isJoined && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-bold flex-shrink-0">
                          <Activity className="h-3.5 w-3.5 animate-pulse" />
                          Membro Ativo
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: HandHeart, label: 'Voluntários', value: m.memberCount },
                      { icon: Crown, label: 'Líder', value: m.leader?.username || 'Não definido' },
                      { icon: Activity, label: 'Status', value: 'Ativo' },
                    ].map(stat => (
                      <div key={stat.label} className="text-center p-3 bg-muted/40 rounded-xl border border-border/50">
                        <div className="flex justify-center mb-1">
                          <stat.icon className="h-4 w-4 text-muted-foreground" style={{ color: m.color }} />
                        </div>
                        <div className="font-bold text-foreground text-sm truncate">{stat.value}</div>
                        <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Propósito */}
                  {m.description && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" /> Propósito & Missão
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-xl border border-border/40">
                        {m.description}
                      </p>
                    </div>
                  )}

                  {/* Atividades */}
                  {activities.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Áreas de Atuação
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activities.map((act: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 rounded-full text-xs font-semibold border text-white" style={{ backgroundColor: m.color }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Membros */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Equipe ({m.memberCount})
                      </h4>
                    </div>

                    {m.membersList.length === 0 ? (
                      <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/60">
                        <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">Nenhum voluntário ainda. Seja o primeiro!</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {m.membersList.map((member: any, idx: number) => {
                          const profile = member.user_profiles
                          if (!profile) return null
                          return (
                            <div key={idx} className="flex items-center gap-2.5 p-2.5 bg-card rounded-xl border border-border/50 hover:border-primary/20 transition-colors">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="h-8 w-8 rounded-full object-cover ring-2 ring-border" />
                              ) : (
                                <div className="h-8 w-8 rounded-full text-white text-xs font-bold flex items-center justify-center uppercase ring-2 ring-border" style={{ backgroundColor: m.color }}>
                                  {profile.username?.slice(0, 2) || 'MB'}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-foreground truncate">{profile.username}</span>
                              {profile.username === m.leader?.username && (
                                <Crown className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 ml-auto" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Limit warning */}
                  {atLimit && (
                    <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <Shield className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Limite de {MAX_MINISTRIES} ministérios atingido. Saia de um para poder entrar neste.
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedMinistryForDetails(null)}
                      className="flex-1 h-11 font-bold rounded-xl"
                    >
                      Fechar
                    </Button>
                    {!isGuest && (
                      <Button
                        onClick={() => toggleJoin(m.id)}
                        disabled={isPending || atLimit}
                        className="flex-1 h-11 font-bold text-white rounded-xl shadow-sm disabled:opacity-50"
                        style={{ backgroundColor: isJoined ? '#dc2626' : m.color }}
                      >
                        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isJoined ? 'Deixar Ministério' : atLimit ? 'Limite Atingido' : 'Participar desta Frente'}
                      </Button>
                    )}
                    {isGuest && (
                      <Button
                        onClick={() => { setSelectedMinistryForDetails(null); navigate('/auth') }}
                        className="flex-1 h-11 font-bold text-white rounded-xl"
                        style={{ backgroundColor: m.color }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />Criar Conta
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Editor de Ministério ─── */}
      <Dialog open={editorOpen} onOpenChange={open => { if (!open) closeEditor() }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingMinistry ? 'Atualizar Ministério' : 'Criar Novo Ministério'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2" onClick={(e) => e.stopPropagation()}>
            {isAdmin && (
              <div className="p-3 bg-blue-50/50 dark:bg-slate-900/40 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1.5">
                <Label className="font-bold flex items-center gap-1.5 text-sm text-blue-900 dark:text-blue-400">
                  <ShieldAlert className="h-4 w-4" /> Líder do Ministério *
                </Label>
                <select
                  value={newMinistry.leaderId}
                  onChange={e => setNewMinistry({ ...newMinistry, leaderId: e.target.value })}
                  className="w-full h-10 px-3 bg-background rounded-md border border-input text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="">-- Escolha um Líder --</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.username} {p.id === user?.id ? '(Você)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Nome Oficial *</Label>
              <Input value={newMinistry.name} onChange={e => setNewMinistry({ ...newMinistry, name: e.target.value.slice(0, NAME_MAX) })} placeholder="Ex: Ministério de Comunicação & Mídia" className="h-10" />
              <p className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{newMinistry.name.length}/{NAME_MAX}</p>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Imagem (URL)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input value={newMinistry.imageUrl} onChange={e => setNewMinistry({ ...newMinistry, imageUrl: e.target.value })} placeholder="https://..." className="h-10 pl-9" />
              </div>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Descrição / Propósito</Label>
              <Textarea value={newMinistry.description} onChange={e => setNewMinistry({ ...newMinistry, description: e.target.value.slice(0, DESCRIPTION_MAX) })} placeholder="Metas e atribuições deste ministério..." rows={3} className="resize-none" />
              <p className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{newMinistry.description.length}/{DESCRIPTION_MAX}</p>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Atividades (separadas por vírgula)</Label>
              <Input value={newMinistry.activities} onChange={e => setNewMinistry({ ...newMinistry, activities: e.target.value })} placeholder="Ex: Design, Filmagem, Transmissão ao vivo" className="h-10" />
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Cor Temática</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PRESETS.map(preset => (
                  <button key={preset} type="button" onClick={() => { setNewMinistry({ ...newMinistry, color: preset }); setColorError(null) }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${newMinistry.color === preset ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'}`}
                    style={{ backgroundColor: preset }} />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-10 h-10 rounded-lg border flex-shrink-0" style={{ backgroundColor: HEX_REGEX.test(newMinistry.color) ? newMinistry.color : 'transparent' }} />
                <Input value={newMinistry.color} onChange={e => { setNewMinistry({ ...newMinistry, color: e.target.value }); setColorError(null) }} className="flex-1 h-10 font-mono" placeholder="#4A90A4" maxLength={7} />
              </div>
              {colorError && <p className="text-xs text-red-500 font-medium mt-1">{colorError}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={closeEditor} variant="outline" className="flex-1 h-10 font-bold" disabled={saving}>Cancelar</Button>
              <Button onClick={createOrUpdate} disabled={saving || !newMinistry.name.trim() || !newMinistry.leaderId} className="flex-1 h-10 font-bold text-white shadow-md" style={{ backgroundColor: HEX_REGEX.test(newMinistry.color) ? newMinistry.color : '#0A2E4A' }}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Gravando...' : editingMinistry ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Confirmação de Exclusão ─── */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent className="rounded-xl border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight">Remover ministério definitivamente?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">Esta ação removerá o registro imediatamente. Todos os vínculos de membros serão perdidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting} className="font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default MinistriesPage
