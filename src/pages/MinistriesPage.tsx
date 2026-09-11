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
  ShieldAlert, Info, Tag, Crown, HandHeart, Shield,
  Star, BookOpen, Music, Mic, Heart, Palette, Globe,
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
const MAX_DEPARTMENTS = 3

const COLOR_PRESETS = [
  '#0A2E4A', '#4A90A4', '#D4A574', '#16A34A',
  '#DC2626', '#9333EA', '#EA580C', '#0EA5E9',
]

const DEPARTMENT_ICONS: Record<string, any> = {
  'louvor': Music, 'música': Music, 'comunicação': Globe, 'mídia': Globe,
  'jovens': Star, 'crianças': Heart, 'oração': HandHeart, 'discipulado': BookOpen,
  'louvor e adoração': Music, 'evangelismo': Globe, 'cuidado': Heart,
  'artes': Palette, 'pregação': Mic,
}

const getDepartmentIcon = (name: string) => {
  const lower = name.toLowerCase()
  for (const [key, Icon] of Object.entries(DEPARTMENT_ICONS)) {
    if (lower.includes(key)) return Icon
  }
  return Users
}

const EMPTY_FORM = { name: '', description: '', color: '#4A90A4', activities: '', imageUrl: '', leaderId: '' }

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [departments, setDepartments] = useState<any[]>([])
  const [joinedDepartments, setJoinedDepartments] = useState<string[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Ministry | null>(null)
  const [newDepartment, setNewDepartment] = useState(EMPTY_FORM)
  const [colorError, setColorError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingJoinIds, setPendingJoinIds] = useState<string[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMine, setFilterMine] = useState(false)
  const [selectedForDetails, setSelectedForDetails] = useState<any | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select(`
          *,
          leader:user_profiles!ministries_leader_id_fkey(username, avatar_url),
          ministry_members(user_id, user_profiles(username, avatar_url))
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading departments:', error)
        toast.error('Erro ao carregar departamentos')
        setLoading(false)
        return
      }

      const formatted = (data || []).map((m: any) => ({
        ...m,
        memberCount: m.ministry_members ? m.ministry_members.length : 0,
        membersList: m.ministry_members || [],
        imageUrl: m.image_url,
        leaderId: m.leader_id,
      }))
      setDepartments(formatted)

      setSelectedForDetails((prev: any) => {
        if (!prev) return null
        return formatted.find((m: any) => m.id === prev.id) || prev
      })
    } catch (err) {
      console.error('Unexpected error loading departments:', err)
      toast.error('Erro inesperado ao carregar departamentos')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadJoinedDepartments = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('ministry_members')
        .select('ministry_id')
        .eq('user_id', user.id)

      if (error) { console.error('Error loading joined departments:', error); return }
      setJoinedDepartments(data?.map((m: any) => m.ministry_id) || [])
    } catch (err) {
      console.error('Unexpected error:', err)
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
      console.error('Unexpected error:', err)
    }
  }, [isAdmin])

  useEffect(() => {
    loadData()
    if (!isGuest && user?.id) loadJoinedDepartments()
    if (isAdmin) loadProfiles()
  }, [user?.id, isGuest, isAdmin])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditingDepartment(null)
    setNewDepartment(EMPTY_FORM)
    setColorError(null)
  }, [])

  const openCreate = useCallback(() => {
    setEditingDepartment(null)
    setNewDepartment(EMPTY_FORM)
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((m: Ministry) => {
    setEditingDepartment(m)
    setNewDepartment({
      name: m.name,
      description: m.description || '',
      color: m.color || '#4A90A4',
      activities: (m as any).activities || '',
      imageUrl: (m as any).imageUrl || (m as any).image_url || '',
      leaderId: (m as any).leaderId || (m as any).leader_id || '',
    })
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const canManage = useCallback(
    (m: any) => isAdmin || (m.leaderId || m.leader_id) === user?.id,
    [isAdmin, user?.id]
  )

  const createOrUpdate = async () => {
    if (!newDepartment.name.trim()) { toast.error('Nome é obrigatório'); return }
    if (!newDepartment.leaderId) { toast.error('É obrigatório definir um líder para o departamento'); return }
    if (!HEX_REGEX.test(newDepartment.color)) { setColorError('Use um código hexadecimal válido, ex: #4A90A4'); return }

    setSaving(true)
    try {
      const payload = {
        name: newDepartment.name.trim(),
        description: newDepartment.description.trim() || null,
        color: newDepartment.color,
        activities: newDepartment.activities.trim() || null,
        image_url: newDepartment.imageUrl.trim() || null,
        leader_id: newDepartment.leaderId,
      }

      if (editingDepartment) {
        if (!isAdmin) { toast.error('Apenas o administrador pode redefinir lideranças'); setSaving(false); return }
        const { error } = await supabase.from('ministries').update(payload).eq('id', editingDepartment.id)
        if (error) throw error
        toast.success('Departamento atualizado')
        // Corrigido: antes registava 'ministry_joined' também na edição —
        // tipo semanticamente errado, agora usa 'ministry_updated'.
        logActivity({
          type: 'ministry_updated', actorId: user!.id, actorName: user!.username,
          title: newDepartment.name, referenceId: editingDepartment.id, referenceType: 'ministry',
        }).catch(() => null)
      } else {
        const { error } = await supabase.from('ministries').insert(payload)
        if (error) throw error
        toast.success('Departamento criado')
        // Corrigido: antes registava 'ministry_joined' na criação também.
        logActivity({
          type: 'ministry_created', actorId: user!.id, actorName: user!.username,
          title: newDepartment.name, referenceType: 'ministry',
        }).catch(() => null)
      }

      closeEditor()
      await loadData()
    } catch (err: any) {
      console.error('Error creating/updating department:', err)
      toast.error(err.message || 'Erro ao processar alteração')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    const targetName = departments.find(d => d.id === deleteTargetId)?.name || 'Departamento'
    setDeleting(true)
    try {
      const { data, error } = await supabase.from('ministries').delete().eq('id', deleteTargetId).select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Operação negada pela RLS')
      toast.success('Departamento removido')
      // Em falta na versão anterior — a exclusão não deixava rasto nenhum
      // no feed de actividade.
      logActivity({
        type: 'ministry_deleted', actorId: user!.id, actorName: user!.username,
        title: targetName, referenceId: deleteTargetId, referenceType: 'ministry',
      }).catch(() => null)
      await loadData()
    } catch (err: any) {
      console.error('Error deleting department:', err)
      toast.error(err.message || 'Falha ao remover item')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const toggleJoin = useCallback(async (departmentId: string) => {
    if (!user?.id || !user?.username) {
      toast.error('Sessão inválida. Faça login novamente.')
      return
    }
    if (pendingJoinIds.includes(departmentId)) return

    const isJoined = joinedDepartments.includes(departmentId)

    if (!isJoined && joinedDepartments.length >= MAX_DEPARTMENTS) {
      toast.error(`Limite atingido! Você já participa de ${MAX_DEPARTMENTS} departamentos. Saia de um para entrar neste.`)
      return
    }

    setPendingJoinIds(prev => [...prev, departmentId])
    setJoinedDepartments(prev => isJoined ? prev.filter(id => id !== departmentId) : [...prev, departmentId])
    setSelectedForDetails((prev: any) => {
      if (!prev || prev.id !== departmentId) return prev
      return { ...prev, memberCount: isJoined ? Math.max(0, prev.memberCount - 1) : prev.memberCount + 1 }
    })

    try {
      if (isJoined) {
        const { error } = await supabase
          .from('ministry_members').delete()
          .eq('ministry_id', departmentId).eq('user_id', user.id)
        if (error) throw error
        toast.success('Você saiu do departamento')
      } else {
        const { error } = await supabase
          .from('ministry_members').insert({ ministry_id: departmentId, user_id: user.id })
        if (error) throw error
        toast.success('Bem-vindo ao departamento')
        const name = departments.find(m => m.id === departmentId)?.name || 'Departamento'
        logActivity({
          type: 'ministry_joined', actorId: user.id, actorName: user.username,
          title: name, referenceId: departmentId, referenceType: 'ministry',
        }).catch(() => null)
      }
      loadData().catch(() => null)
    } catch (err: any) {
      console.error('toggleJoin error:', err)
      setJoinedDepartments(prev => isJoined ? [...prev, departmentId] : prev.filter(id => id !== departmentId))
      setSelectedForDetails((prev: any) => {
        if (!prev || prev.id !== departmentId) return prev
        return { ...prev, memberCount: isJoined ? prev.memberCount + 1 : Math.max(0, prev.memberCount - 1) }
      })

      if (err.code === '23505') toast.error('Você já é membro deste departamento')
      else if (err.code === '42501' || err.status === 403) toast.error('Permissão negada.')
      else if (err.status === 401) toast.error('Sua sessão expirou. Faça login novamente.')
      else if (err.name === 'TypeError' && err.message?.toLowerCase().includes('failed to fetch')) toast.error('Erro de conexão. Verifique sua internet.')
      else toast.error(err.message || 'Erro ao processar sua inscrição.')
    } finally {
      setPendingJoinIds(prev => prev.filter(id => id !== departmentId))
    }
  }, [joinedDepartments, pendingJoinIds, user, departments, loadData])

  const filteredDepartments = useMemo(() => {
    let list = departments
    if (filterMine) list = list.filter(m => joinedDepartments.includes(m.id))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        (m as any).activities?.toLowerCase().includes(q)
      )
    }
    return list
  }, [departments, filterMine, joinedDepartments, searchQuery])

  if (loading) {
    return (
      <Layout title="Departamentos">
        <LoadingState fullScreen message="Carregando departamentos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Departamentos">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Departamentos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {departments.length} departamentos · até {MAX_DEPARTMENTS} por pessoa
              {!isGuest && joinedDepartments.length > 0 && (
                <span className="ml-1 text-foreground font-medium">
                  ({joinedDepartments.length}/{MAX_DEPARTMENTS} usados)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/groups')} className="text-xs rounded-md">
              <Users2 className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />Grupos
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="rounded-md">
                <Plus className="h-4 w-4 mr-1.5" />Novo Departamento
              </Button>
            )}
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="rounded-md">
                <UserPlus className="h-4 w-4 mr-1.5" />Criar Conta
              </Button>
            )}
          </div>
        </div>

        {/* Indicador de limite — âmbar mantido: é um estado real de aviso,
            não decoração (mesmo tratamento do alerta de aconselhamento no
            Dashboard) */}
        {!isGuest && !isAdmin && joinedDepartments.length > 0 && (
          <Card className={`p-3.5 border rounded-lg flex items-center gap-3 ${
            joinedDepartments.length >= MAX_DEPARTMENTS
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
              : ''
          }`}>
            <Shield className={`h-4 w-4 flex-shrink-0 ${
              joinedDepartments.length >= MAX_DEPARTMENTS ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
            }`} strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {joinedDepartments.length >= MAX_DEPARTMENTS
                  ? `Limite de ${MAX_DEPARTMENTS} departamentos atingido`
                  : `${joinedDepartments.length} de ${MAX_DEPARTMENTS} departamentos`}
              </p>
              <p className="text-xs text-muted-foreground">
                {joinedDepartments.length >= MAX_DEPARTMENTS
                  ? 'Saia de um departamento para entrar em outro'
                  : `Ainda pode entrar em mais ${MAX_DEPARTMENTS - joinedDepartments.length}`}
              </p>
            </div>
            <div className="w-20 bg-muted rounded-full h-1.5 flex-shrink-0 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  joinedDepartments.length >= MAX_DEPARTMENTS ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${(joinedDepartments.length / MAX_DEPARTMENTS) * 100}%` }}
              />
            </div>
          </Card>
        )}

        {/* Filtros */}
        {departments.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, propósito ou atividade..."
                className="pl-9 h-9 rounded-md"
              />
            </div>
            {!isGuest && (
              <button
                onClick={() => setFilterMine(v => !v)}
                className={`flex-shrink-0 px-3 h-9 rounded-md text-xs font-medium border transition-colors ${
                  filterMine ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Meus Departamentos ({joinedDepartments.length})
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {departments.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isAdmin ? 'Nenhum departamento criado' : 'Nenhum departamento disponível'}
            description={isAdmin ? 'Crie o primeiro departamento da casa' : 'Novos departamentos em breve'}
            action={isAdmin ? (
              <Button onClick={openCreate} className="rounded-md">
                <Plus className="mr-2 h-4 w-4" />Criar Departamento
              </Button>
            ) : undefined}
          />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState icon={Search} title="Nenhum resultado encontrado" description="Tente ajustar a busca ou os filtros" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map(department => (
              <MinistryCard
                key={department.id}
                ministry={department}
                isJoined={joinedDepartments.includes(department.id)}
                isPending={pendingJoinIds.includes(department.id)}
                isGuest={isGuest}
                canManage={canManage(department)}
                isAdmin={isAdmin}
                atLimit={!joinedDepartments.includes(department.id) && joinedDepartments.length >= MAX_DEPARTMENTS}
                onToggleJoin={toggleJoin}
                onEdit={openEdit}
                onDelete={setDeleteTargetId}
                onAuthNavigate={() => navigate('/auth')}
                onViewDetails={setSelectedForDetails}
              />
            ))}
          </div>
        )}

        {isGuest && departments.length > 0 && (
          <GuestPrompt
            title="Faça parte da nossa comunidade"
            description={`Membros podem se inscrever em até ${MAX_DEPARTMENTS} departamentos e acompanhar funções de liderança.`}
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* Modal de detalhes */}
      <Dialog open={!!selectedForDetails} onOpenChange={open => { if (!open) setSelectedForDetails(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-0">
          {selectedForDetails && (() => {
            const m = selectedForDetails
            const DeptIcon = getDepartmentIcon(m.name)
            const isJoined = joinedDepartments.includes(m.id)
            const isPending = pendingJoinIds.includes(m.id)
            const atLimit = !isJoined && joinedDepartments.length >= MAX_DEPARTMENTS
            const activities = m.activities ? m.activities.split(',').map((a: string) => a.trim()).filter(Boolean) : []

            return (
              <div>
                {/* Banner — acento fino da cor do departamento, sem preencher tudo */}
                <div
                  className="h-40 md:h-48 relative flex items-end overflow-hidden border-b-4"
                  style={{ borderBottomColor: m.color, backgroundColor: !m.imageUrl ? `${m.color}10` : undefined }}
                >
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <DeptIcon className="h-14 w-14" style={{ color: m.color }} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                  <div className="relative z-10 p-5 w-full flex items-end justify-between gap-3">
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground leading-tight">{m.name}</h2>
                    {isJoined && (
                      <span className="px-2.5 py-1 bg-primary text-primary-foreground rounded-md text-xs font-medium flex-shrink-0">
                        Você participa
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Estatísticas reais — removido "Status: Ativo" (era string
                      fixa, não calculada) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border text-center">
                      <HandHeart className="h-4 w-4 text-muted-foreground mx-auto mb-1" strokeWidth={1.75} />
                      <div className="font-semibold text-foreground text-sm">{m.memberCount}</div>
                      <div className="text-[11px] text-muted-foreground">Voluntários</div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg border border-border text-center">
                      <Crown className="h-4 w-4 mx-auto mb-1" style={{ color: '#D4A574' }} strokeWidth={1.75} />
                      <div className="font-semibold text-foreground text-sm truncate">{m.leader?.username || 'Não definido'}</div>
                      <div className="text-[11px] text-muted-foreground">Líder</div>
                    </div>
                  </div>

                  {m.description && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" strokeWidth={1.75} />Propósito
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">{m.description}</p>
                    </div>
                  )}

                  {/* Tags de actividade — sem preenchimento total na cor do
                      departamento; borda fina + texto na cor, fundo neutro */}
                  {activities.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" strokeWidth={1.75} />Áreas de atuação
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {activities.map((act: string, i: number) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-md text-xs font-medium border"
                            style={{ color: m.color, borderColor: `${m.color}40` }}
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" strokeWidth={1.75} />Equipe ({m.memberCount})
                    </h4>

                    {m.membersList.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">Nenhum voluntário ainda.</p>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {m.membersList.map((member: any, idx: number) => {
                          const profile = member.user_profiles
                          if (!profile) return null
                          // Corrigido: comparação era por username (frágil);
                          // agora compara por user_id contra leaderId real.
                          const isLeader = member.user_id === (m.leaderId || m.leader_id)
                          return (
                            <div key={idx} className="flex items-center gap-2.5 p-2 rounded-md border border-border">
                              {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center flex-shrink-0">
                                  {profile.username?.slice(0, 2).toUpperCase() || 'MB'}
                                </div>
                              )}
                              <span className="text-sm text-foreground truncate flex-1">{profile.username}</span>
                              {isLeader && <Crown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#D4A574' }} strokeWidth={2} />}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {atLimit && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-2.5">
                      Limite de {MAX_DEPARTMENTS} departamentos atingido. Saia de um para entrar neste.
                    </p>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button variant="outline" onClick={() => setSelectedForDetails(null)} className="flex-1 rounded-md">
                      Fechar
                    </Button>
                    {!isGuest ? (
                      <Button
                        onClick={() => toggleJoin(m.id)}
                        disabled={isPending || atLimit}
                        variant={isJoined ? 'outline' : 'default'}
                        className={`flex-1 rounded-md ${isJoined ? 'text-destructive border-destructive/40 hover:bg-destructive/10' : ''}`}
                      >
                        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isJoined ? 'Sair do departamento' : atLimit ? 'Limite atingido' : 'Participar'}
                      </Button>
                    ) : (
                      <Button onClick={() => { setSelectedForDetails(null); navigate('/auth') }} className="flex-1 rounded-md">
                        <UserPlus className="h-4 w-4 mr-2" />Criar conta
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Editor */}
      <Dialog open={editorOpen} onOpenChange={open => { if (!open) closeEditor() }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {editingDepartment ? 'Editar Departamento' : 'Criar Departamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {isAdmin && (
              <div className="space-y-1.5">
                <Label className="font-medium text-sm flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />Líder do Departamento *
                </Label>
                <select
                  value={newDepartment.leaderId}
                  onChange={e => setNewDepartment({ ...newDepartment, leaderId: e.target.value })}
                  className="w-full h-10 px-3 bg-background rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um líder</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.username}{p.id === user?.id ? ' (Você)' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="font-medium text-sm mb-1 block">Nome *</Label>
              <Input
                value={newDepartment.name}
                onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value.slice(0, NAME_MAX) })}
                placeholder="Ex: Comunicação e Mídia"
                className="h-10 rounded-md"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{newDepartment.name.length}/{NAME_MAX}</p>
            </div>

            <div>
              <Label className="font-medium text-sm mb-1 block">Imagem (URL opcional)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newDepartment.imageUrl}
                  onChange={e => setNewDepartment({ ...newDepartment, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-10 pl-9 rounded-md"
                />
              </div>
            </div>

            <div>
              <Label className="font-medium text-sm mb-1 block">Descrição</Label>
              <Textarea
                value={newDepartment.description}
                onChange={e => setNewDepartment({ ...newDepartment, description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                placeholder="Propósito deste departamento..."
                rows={3}
                className="resize-none rounded-md"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{newDepartment.description.length}/{DESCRIPTION_MAX}</p>
            </div>

            <div>
              <Label className="font-medium text-sm mb-1 block">Atividades (separadas por vírgula)</Label>
              <Input
                value={newDepartment.activities}
                onChange={e => setNewDepartment({ ...newDepartment, activities: e.target.value })}
                placeholder="Ex: Design, Filmagem, Transmissão"
                className="h-10 rounded-md"
              />
            </div>

            <div>
              <Label className="font-medium text-sm mb-1 block">Cor</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset} type="button"
                    onClick={() => { setNewDepartment({ ...newDepartment, color: preset }); setColorError(null) }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${newDepartment.color === preset ? 'scale-110 border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-10 h-10 rounded-md border flex-shrink-0" style={{ backgroundColor: HEX_REGEX.test(newDepartment.color) ? newDepartment.color : 'transparent' }} />
                <Input
                  value={newDepartment.color}
                  onChange={e => { setNewDepartment({ ...newDepartment, color: e.target.value }); setColorError(null) }}
                  className="flex-1 h-10 font-mono rounded-md"
                  placeholder="#4A90A4"
                  maxLength={7}
                />
              </div>
              {colorError && <p className="text-xs text-destructive mt-1">{colorError}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={closeEditor} variant="outline" className="flex-1 rounded-md" disabled={saving}>Cancelar</Button>
              <Button
                onClick={createOrUpdate}
                disabled={saving || !newDepartment.name.trim() || !newDepartment.leaderId}
                className="flex-1 rounded-md"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Salvando...' : editingDepartment ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover departamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os vínculos de membros serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default MinistriesPage
