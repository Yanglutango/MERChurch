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
  Users, UserPlus, UserMinus, Plus, Edit2, Trash2, HandHeart, Activity,
  Save, Tag, Users2, Search, Loader2, Image as ImageIcon, Crown, ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const NAME_MAX = 60
const DESCRIPTION_MAX = 300
const HEX_REGEX = /^#([0-9A-Fa-f]{6})$/

const COLOR_PRESETS = [
  '#0A2E4A', '#4A90A4', '#D4A574', '#16A34A',
  '#DC2626', '#9333EA', '#EA580C', '#0EA5E9',
]

const EMPTY_FORM = { name: '', description: '', color: '#4A90A4', activities: '', imageUrl: '' }

function extractCount(rel: unknown): number {
  if (!rel) return 0
  if (Array.isArray(rel)) return (rel[0] as any)?.count ?? 0
  return (rel as any)?.count ?? 0
}

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [newMinistry, setNewMinistry] = useState(EMPTY_FORM)
  const [colorError, setColorError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingJoinIds, setPendingJoinIds] = useState<Set<string>>(new Set())
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMine, setFilterMine] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadMinistries()
    if (!isGuest && user?.id) loadJoinedMinistries()
  }, [user?.id, isGuest])

  const loadMinistries = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select('*, leader:user_profiles(username, avatar_url), ministry_members(count)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao carregar ministérios:', error)
        toast.error(error.message || 'Erro ao carregar ministérios')
        return
      }

      const withCounts = (data || []).map((m: any) => ({
        ...m,
        memberCount: extractCount(m.ministry_members),
      }))
      setMinistries(withCounts)
    } catch (err) {
      console.error('Erro inesperado ao carregar ministérios:', err)
      toast.error('Erro inesperado ao carregar ministérios')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadJoinedMinistries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_members')
        .select('ministry_id')
        .eq('user_id', user!.id)

      if (error) {
        console.error('Erro ao carregar ministérios associados:', error)
        toast.error('Não foi possível carregar suas participações')
        return
      }
      setJoinedMinistries(data?.map(m => m.ministry_id) || [])
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Não foi possível carregar suas participações')
    }
  }, [user?.id])

  const closeEditor = () => {
    setEditorOpen(false)
    setEditingMinistry(null)
    setNewMinistry(EMPTY_FORM)
    setColorError(null)
  }

  const openCreate = () => {
    setEditingMinistry(null)
    setNewMinistry(EMPTY_FORM)
    setColorError(null)
    setEditorOpen(true)
  }

  const openEdit = (m: Ministry) => {
    setEditingMinistry(m)
    setNewMinistry({
      name: m.name,
      description: m.description || '',
      color: m.color || '#4A90A4',
      activities: (m as any).activities || '',
      imageUrl: m.imageUrl || '',
    })
    setColorError(null)
    setEditorOpen(true)
  }

  const canManage = (m: Ministry) => isAdmin || m.leaderId === user?.id

  const createOrUpdate = async () => {
    if (!newMinistry.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!HEX_REGEX.test(newMinistry.color)) {
      setColorError('Use um código hexadecimal válido, ex: #4A90A4')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: newMinistry.name.trim(),
        description: newMinistry.description.trim() || null,
        color: newMinistry.color,
        activities: newMinistry.activities.trim() || null,
        image_url: newMinistry.imageUrl.trim() || null,
      }

      if (editingMinistry) {
        if (!canManage(editingMinistry)) {
          toast.error('Apenas o líder ou um administrador pode editar este ministério')
          setSaving(false)
          return
        }

        const { error } = await supabase.from('ministries').update(payload).eq('id', editingMinistry.id)
        if (error) { toast.error(error.message || 'Erro ao atualizar ministério'); setSaving(false); return }

        toast.success('Ministério atualizado com sucesso!')
        try {
          await logActivity({
            type: 'ministry_updated',
            actorId: user!.id,
            actorName: user!.username,
            title: newMinistry.name,
            referenceId: editingMinistry.id,
            referenceType: 'ministry',
          })
        } catch (logErr) {
          console.error('Erro de log ao atualizar ministério:', logErr)
        }
      } else {
        const { error } = await supabase.from('ministries').insert({ ...payload, leader_id: user!.id })
        if (error) { toast.error(error.message || 'Erro ao criar ministério'); setSaving(false); return }

        toast.success('Ministério criado com sucesso!')
        try {
          await logActivity({
            type: 'ministry_created',
            actorId: user!.id,
            actorName: user!.username,
            title: newMinistry.name,
            referenceType: 'ministry',
          })
        } catch (logErr) {
          console.error('Erro de log ao criar ministério:', logErr)
        }
      }

      closeEditor()
      await loadMinistries()
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao processar ministério')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const { data, error } = await supabase.from('ministries').delete().eq('id', deleteTargetId).select('id')
      if (error) { toast.error(error.message || 'Erro ao excluir ministério'); return }
      if (!data || data.length === 0) { toast.error('Sem permissão para excluir este ministério'); return }

      toast.success('Ministério excluído com sucesso!')
      try {
        await logActivity({
          type: 'ministry_deleted',
          actorId: user!.id,
          actorName: user!.username,
          title: 'Ministério removido',
          referenceId: deleteTargetId,
          referenceType: 'ministry',
        })
      } catch (logErr) {
        console.error('Erro de log ao excluir ministério:', logErr)
      }
      await loadMinistries()
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao excluir ministério')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const toggleJoin = async (ministryId: string) => {
  if (pendingJoinIds.has(ministryId)) return // evita duplo clique / duplo insert
  const isJoined = joinedMinistries.includes(ministryId)

  setPendingJoinIds(prev => new Set(prev).add(ministryId))
  try {
    if (isJoined) {
      const { error } = await supabase
        .from('ministry_members')
        .delete()
        .eq('ministry_id', ministryId)
        .eq('user_id', user!.id)

      if (error) { toast.error(error.message || 'Erro ao sair do ministério'); return }

      setJoinedMinistries(prev => prev.filter(id => id !== ministryId))
      setMinistries(prev => prev.map(m =>
        m.id === ministryId ? { ...m, memberCount: Math.max(0, (m.memberCount || 1) - 1) } : m
      ))
      toast.success('Você saiu do ministério')
    } else {
      const { error } = await supabase
        .from('ministry_members')
        .insert({ ministry_id: ministryId, user_id: user!.id })

      if (error) { toast.error(error.message || 'Erro ao entrar no ministério'); return }

      // Atualiza os estados locais primeiro para garantir a resposta visual imediata ao usuário
      setJoinedMinistries(prev => [...prev, ministryId])
      setMinistries(prev => prev.map(m =>
        m.id === ministryId ? { ...m, memberCount: (m.memberCount || 0) + 1 } : m
      ))
      toast.success('Bem-vindo ao ministério! 🙏')

      // Executa o log de atividade de forma segura e isolada
      try {
        const ministry = ministries.find(m => m.id === ministryId)
        await logActivity({
          type: 'ministry_joined',
          actorId: user!.id,
          actorName: user!.username,
          title: ministry?.name || 'Ministério',
          referenceId: ministryId,
          referenceType: 'ministry',
        })
      } catch (logErr) {
        // Apenas reporta no console para não interromper a navegação do usuário
        console.error('Falha não crítica ao registrar log de atividade:', logErr)
      }
    }
  } catch (err) {
    console.error('Erro inesperado:', err)
    toast.error('Erro inesperado ao processar solicitação')
  } finally {
    setPendingJoinIds(prev => {
      const next = new Set(prev)
      next.delete(ministryId)
      return next
    })
  }
}
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
        <LoadingState fullScreen message="Carregando ministérios..." />
      </Layout>
    )
  }

  return (
    <Layout title="Ministérios">
      <div className="p-4 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ministérios</h1>
            <p className="text-sm text-muted-foreground">{ministries.length} ministérios ativos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/groups')} className="text-xs font-semibold">
              <Users2 className="h-3.5 w-3.5 mr-1.5" />Grupos
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={openCreate} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />Criar Ministério
              </Button>
            )}
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-1.5" />Entrar
              </Button>
            )}
          </div>
        </div>

        {ministries.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, descrição ou atividade..."
                className="pl-9 h-9"
              />
            </div>
            {!isGuest && (
              <button
                onClick={() => setFilterMine(v => !v)}
                className={`flex-shrink-0 px-3 h-9 rounded-lg text-xs font-semibold border transition-colors ${
                  filterMine ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                Meus Ministérios ({joinedMinistries.length})
              </button>
            )}
          </div>
        )}

        {ministries.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isAdmin ? 'Nenhum ministério criado' : 'Nenhum ministério disponível'}
            description={isAdmin ? 'Crie o primeiro ministério da casa' : 'Novos ministérios em breve'}
            action={isAdmin ? (
              <Button onClick={openCreate} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                <Plus className="mr-2 h-4 w-4" />Criar Ministério
              </Button>
            ) : undefined}
          />
        ) : filteredMinistries.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum resultado encontrado"
            description="Tente ajustar a busca ou os filtros"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMinistries.map(ministry => {
              const isJoined = joinedMinistries.includes(ministry.id)
              const isPending = pendingJoinIds.has(ministry.id)
              const isExpanded = expandedId === ministry.id
              const longDescription = (ministry.description?.length || 0) > 90

              return (
                <Card
                  key={ministry.id}
                  className="group relative overflow-hidden border hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200"
                >
                  <div
                    className="h-24 relative flex items-center justify-center"
                    style={ministry.imageUrl ? undefined : { backgroundColor: `${ministry.color}15` }}
                  >
                    {ministry.imageUrl ? (
                      <img src={ministry.imageUrl} alt={ministry.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-8 w-8" style={{ color: ministry.color }} />
                    )}
                    {isJoined && !isGuest && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-green-600 rounded-full shadow-sm">
                        <Activity className="h-2.5 w-2.5 text-white" />
                        <span className="text-[10px] font-bold text-white">Ativo</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {ministry.name}
                      </h3>
                      {canManage(ministry) && (
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="sm" variant="ghost" onClick={() => openEdit(ministry)}
                            className="h-7 w-7 p-0" aria-label={`Editar ${ministry.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm" variant="ghost" onClick={() => setDeleteTargetId(ministry.id)}
                              className="h-7 w-7 p-0" aria-label={`Excluir ${ministry.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {ministry.leader?.username && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Crown className="h-3 w-3 text-amber-500 flex-shrink-0" />
                        <span>Liderado por <span className="font-medium text-foreground">{ministry.leader.username}</span></span>
                      </div>
                    )}

                    {ministry.description && (
                      <div>
                        <p className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {ministry.description}
                        </p>
                        {longDescription && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : ministry.id)}
                            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary mt-1"
                          >
                            {isExpanded ? <>Ver menos <ChevronUp className="h-3 w-3" /></> : <>Ver mais <ChevronDown className="h-3 w-3" /></>}
                          </button>
                        )}
                      </div>
                    )}

                    {(ministry as any).activities && (
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: ministry.color }} />
                        <span className="line-clamp-1">{(ministry as any).activities}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HandHeart className="h-3.5 w-3.5" style={{ color: ministry.color }} />
                        <span className="font-semibold">
                          {ministry.memberCount || 0} {ministry.memberCount === 1 ? 'participante' : 'participantes'}
                        </span>
                      </div>
                    </div>

                    {isGuest ? (
                      <Button onClick={() => navigate('/auth')} size="sm" className="w-full text-white font-semibold" style={{ backgroundColor: ministry.color }}>
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />Criar Conta para Servir
                      </Button>
                    ) : isJoined ? (
                      <Button
                        onClick={() => toggleJoin(ministry.id)}
                        disabled={isPending}
                        size="sm"
                        variant="outline"
                        className="w-full font-semibold border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5 mr-1.5" />}
                        Sair
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggleJoin(ministry.id)}
                        disabled={isPending}
                        size="sm"
                        variant="outline"
                        className="w-full font-semibold"
                        style={{ borderColor: ministry.color, color: ministry.color }}
                      >
                        {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" />}
                        Participar
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {isGuest && ministries.length > 0 && (
          <GuestPrompt
            title="Faça parte do corpo de Cristo"
            description="Membros podem participar de ministérios e servir ativamente."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      <Dialog open={editorOpen} onOpenChange={open => { if (!open) closeEditor() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingMinistry ? 'Editar Ministério' : 'Criar Ministério'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Nome *</Label>
              <Input
                value={newMinistry.name}
                onChange={e => setNewMinistry({ ...newMinistry, name: e.target.value.slice(0, NAME_MAX) })}
                placeholder="Ex: Louvor e Adoração"
                className="h-10 border"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{newMinistry.name.length}/{NAME_MAX}</p>
            </div>

            <div>
              <Label className="font-semibold mb-1 block">Imagem (URL opcional)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newMinistry.imageUrl}
                  onChange={e => setNewMinistry({ ...newMinistry, imageUrl: e.target.value })}
                  placeholder="https://..."
                  className="h-10 pl-9 border"
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold mb-1 block">Descrição</Label>
              <Textarea
                value={newMinistry.description}
                onChange={e => setNewMinistry({ ...newMinistry, description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                placeholder="Propósito deste ministério..."
                rows={3}
                className="resize-none border"
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{newMinistry.description.length}/{DESCRIPTION_MAX}</p>
            </div>

            <div>
              <Label className="font-semibold mb-1 block">Atividades</Label>
              <Input
                value={newMinistry.activities}
                onChange={e => setNewMinistry({ ...newMinistry, activities: e.target.value })}
                placeholder="Ex: Ensaios, cultos, visitas..."
                className="h-10 border"
              />
            </div>

            <div>
              <Label className="font-semibold mb-1 block">Cor</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setNewMinistry({ ...newMinistry, color: preset }); setColorError(null) }}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${newMinistry.color === preset ? 'scale-110 border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: preset }}
                    aria-label={`Cor ${preset}`}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div
                  className="w-10 h-10 rounded-lg border flex-shrink-0"
                  style={{ backgroundColor: HEX_REGEX.test(newMinistry.color) ? newMinistry.color : 'transparent' }}
                />
                <Input
                  value={newMinistry.color}
                  onChange={e => { setNewMinistry({ ...newMinistry, color: e.target.value }); setColorError(null) }}
                  className="flex-1 h-10 font-mono border"
                  placeholder="#4A90A4"
                  maxLength={7}
                />
              </div>
              {colorError && <p className="text-xs text-red-500 mt-1">{colorError}</p>}
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={closeEditor} variant="outline" className="flex-1 h-10" disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={createOrUpdate}
                disabled={saving || !newMinistry.name.trim()}
                className="flex-1 h-10 font-bold text-white"
                style={{ backgroundColor: HEX_REGEX.test(newMinistry.color) ? newMinistry.color : '#0A2E4A' }}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Salvando...' : editingMinistry ? 'Atualizar' : 'Criar Ministério'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ministério?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os membros vinculados perderão o vínculo com este ministério.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default MinistriesPage
