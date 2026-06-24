import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
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
import { Users, Plus, UserPlus, Save, Users2, Search, Loader2, Image as ImageIcon, Crown, Tag, HandHeart, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { MinistryCard } from '../components/ministries/MinistryCard'

const NAME_MAX = 60
const DESCRIPTION_MAX = 300
const HEX_REGEX = /^#([0-9A-Fa-f]{6})$/

const COLOR_PRESETS = [
  '#0A2E4A', '#4A90A4', '#D4A574', '#16A34A',
  '#DC2626', '#9333EA', '#EA580C', '#0EA5E9',
]

const EMPTY_FORM = { name: '', description: '', color: '#4A90A4', activities: '', imageUrl: '' }

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ministries, setMinistries] = useState<any[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedMinistry, setSelectedMinistry] = useState<any>(null)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [newMinistry, setNewMinistry] = useState(EMPTY_FORM)
  const [colorError, setColorError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingJoinIds, setPendingJoinIds] = useState<string[]>([])
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [filterMine, setFilterMine] = useState(false)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  const loadMinistries = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select('*, leader:user_profiles(username, avatar_url), ministry_members(user_profiles(username, avatar_url))')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error(error.message || 'Erro ao carregar ministérios')
        return
      }

      const formatted = (data || []).map((m: any) => ({
        ...m,
        memberCount: m.ministry_members ? m.ministry_members.length : 0,
        membersList: m.ministry_members || []
      }))
      setMinistries(formatted)
      
      // Sincroniza o modal de detalhes caso esteja aberto para atualizar os membros em tempo real
      if (selectedMinistry) {
        const updated = formatted.find(f => f.id === selectedMinistry.id)
        if (updated) setSelectedMinistry(updated)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro inesperado ao carregar ministérios')
    } finally {
      setLoading(false)
    }
  }, [selectedMinistry])

  const loadJoinedMinistries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ministry_members')
        .select('ministry_id')
        .eq('user_id', user!.id)

      if (error) return
      setJoinedMinistries(data?.map(m => m.ministry_id) || [])
    } catch (err) {
      console.error(err)
    }
  }, [user?.id])

  useEffect(() => {
    loadMinistries()
    if (!isGuest && user?.id) loadJoinedMinistries()
  }, [user?.id, isGuest])

  // Processa e extrai as tags exclusivas mais populares para o filtro avançado
  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    ministries.forEach(m => {
      if (m.activities) {
        m.activities.split(',').forEach((act: string) => {
          const trimmed = act.trim()
          if (trimmed) tags.add(trimmed)
        })
      }
    })
    return Array.from(tags).slice(0, 8)
  }, [ministries])

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
      imageUrl: m.imageUrl || '',
    })
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const handleViewDetails = useCallback((m: any) => {
    setSelectedMinistry(m)
    setDetailsOpen(true)
  }, [])

  const canManage = useCallback((m: Ministry) => isAdmin || m.leaderId === user?.id, [isAdmin, user?.id])

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
          toast.error('Sem permissão para editar este ministério')
          setSaving(false)
          return
        }

        const { error } = await supabase.from('ministries').update(payload).eq('id', editingMinistry.id)
        if (error) throw error

        toast.success('Ministério atualizado!')
        logActivity({ type: 'ministry_updated', actorId: user!.id, actorName: user!.username, title: newMinistry.name, referenceId: editingMinistry.id, referenceType: 'ministry' }).catch(() => null)
      } else {
        const { error } = await supabase.from('ministries').insert({ ...payload, leader_id: user!.id })
        if (error) throw error

        toast.success('Ministério criado!')
        logActivity({ type: 'ministry_created', actorId: user!.id, actorName: user!.username, title: newMinistry.name, referenceType: 'ministry' }).catch(() => null)
      }

      closeEditor()
      await loadMinistries()
    } catch (err: any) {
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
      logActivity({ type: 'ministry_deleted', actorId: user!.id, actorName: user!.username, title: 'Ministério removido', referenceId: deleteTargetId, referenceType: 'ministry' }).catch(() => null)
      await loadMinistries()
    } catch (err: any) {
      toast.error(err.message || 'Falha ao remover item')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const toggleJoin = useCallback(async (ministryId: string) => {
    if (pendingJoinIds.includes(ministryId)) return
    const isJoined = joinedMinistries.includes(ministryId)

    setPendingJoinIds(prev => [...prev, ministryId])
    try {
      if (isJoined) {
        const { error } = await supabase
          .from('ministry_members')
          .delete()
          .eq('ministry_id', ministryId)
          .eq('user_id', user!.id)

        if (error) throw error

        setJoinedMinistries(prev => prev.filter(id => id !== ministryId))
        toast.success('Você deixou o ministério')
      } else {
        const { error } = await supabase
          .from('ministry_members')
          .insert({ ministry_id: ministryId, user_id: user!.id })

        if (error) throw error

        setJoinedMinistries(prev => [...prev, ministryId])
        toast.success('Bem-vindo ao ministério! 🙏')

        const currentMin = ministries.find(m => m.id === ministryId)
        logActivity({ type: 'ministry_joined', actorId: user!.id, actorName: user!.username, title: currentMin?.name || 'Ministério', referenceId: ministryId, referenceType: 'ministry' }).catch(() => null)
      }
      
      await loadMinistries()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro de comunicação com o servidor')
    } finally {
      setPendingJoinIds(prev => prev.filter(id => id !== ministryId))
    }
  }, [joinedMinistries, pendingJoinIds, user, ministries, loadMinistries])

  const filteredMinistries = useMemo(() => {
    let list = ministries
    if (filterMine) list = list.filter(m => joinedMinistries.includes(m.id))
    if (selectedTag) list = list.filter(m => m.activities?.toLowerCase().includes(selectedTag.toLowerCase()))
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.activities?.toLowerCase().includes(q)
      )
    }
    return list
  }, [ministries, filterMine, selectedTag, searchQuery, joinedMinistries])

  if (loading && ministries.length === 0) {
    return (
      <Layout title="Ministérios">
        <LoadingState fullScreen message="Sincronizando infraestrutura..." />
      </Layout>
    )
  }

  return (
    <Layout title="Ministérios">
      <div className="p-4 space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">Ministérios</h1>
            <p className="text-xs text-muted-foreground font-medium">{ministries.length} núcleos operando no ecossistema</p>
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
          </div>
        </div>

        {/* Controladores & Add Ministry Search Filters */}
        {ministries.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por nome, propósito ou competência..."
                  className="pl-9 h-10"
                />
              </div>
              {!isGuest && (
                <Button
                  variant={filterMine ? "default" : "outline"}
                  onClick={() => setFilterMine(v => !v)}
                  className={`h-10 text-xs font-bold ${filterMine ? 'bg-[#0A2E4A] text-white' : ''}`}
                >
                  Minhas Atividades ({joinedMinistries.length})
                </Button>
              )}
            </div>

            {/* Chips de Categorias Dinâmicas (Filtros Avançados) */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                <span className="text-[11px] font-bold text-muted-foreground mr-1">Filtros Rápidos:</span>
                <button
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${!selectedTag ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'bg-muted border-transparent hover:bg-muted/80'}`}
                >
                  Todos
                </button>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${selectedTag === tag ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'bg-secondary/60 border-transparent hover:bg-secondary'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grid principal */}
        {ministries.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum núcleo operacional ativo"
            description="Novas frentes de atuação serão listadas em breve."
          />
        ) : filteredMinistries.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum resultado indexado"
            description="Modifique os parâmetros ou remova os filtros ativos."
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
                onToggleJoin={toggleJoin}
                onEdit={openEdit}
                onDelete={setDeleteTargetId}
                onAuthNavigate={() => navigate('/auth')}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Ministry Detail Modal (Visualização Imersiva Expandida) */}
      <Dialog open={detailsOpen} onOpenChange={open => { if (!open) setDetailsOpen(false) }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border p-0">
          {selectedMinistry && (
            <div className="space-y-0">
              {/* Banner do Modal */}
              <div className="h-44 relative bg-muted" style={selectedMinistry.imageUrl ? undefined : { backgroundColor: `${selectedMinistry.color}20` }}>
                {selectedMinistry.imageUrl ? (
                  <img src={selectedMinistry.imageUrl} alt={selectedMinistry.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-16 w-16" style={{ color: selectedMinistry.color }} />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 pt-12">
                  <h2 className="text-xl font-black text-white tracking-tight">{selectedMinistry.name}</h2>
                </div>
              </div>

              {/* Informações Funcionais */}
              <div className="p-6 space-y-5">
                {selectedMinistry.leader?.username && (
                  <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border">
                    <Crown className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="text-muted-foreground font-medium">Liderança Executiva</p>
                      <p className="font-bold text-foreground text-sm">{selectedMinistry.leader.username}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Missão & Atribuições</h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{selectedMinistry.description || 'Nenhuma descrição adicionada ao núcleo.'}</p>
                </div>

                {selectedMinistry.activities && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Frentes de Trabalho</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMinistry.activities.split(',').map((act: string, i: number) => (
                        <span key={i} className="text-xs font-semibold bg-secondary px-2.5 py-1 rounded-md text-secondary-foreground">
                          {act.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Listagem Integral de Membros (Add Member Profiles Completo) */}
                <div className="space-y-2.5 pt-2 border-t">
                  <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground uppercase tracking-wider">
                    <HandHeart className="h-3.5 w-3.5" style={{ color: selectedMinistry.color }} />
                    <span>Equipe Operacional ({selectedMinistry.memberCount})</span>
                  </div>
                  
                  {selectedMinistry.membersList?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhum voluntário integrado neste momento.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                      {selectedMinistry.membersList?.map((m: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border border-border/50">
                          {m.user_profiles?.avatar_url ? (
                            <img src={m.user_profiles.avatar_url} className="h-5 w-5 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="h-5 w-5 rounded-full bg-[#0A2E4A] text-[8px] font-bold text-white flex items-center justify-center uppercase">
                              {m.user_profiles?.username?.slice(0, 2) || 'MB'}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate text-foreground">{m.user_profiles?.username || 'Voluntário'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações Integradas no Modal */}
                <div className="pt-4 border-t flex justify-end">
                  {isGuest ? (
                    <Button onClick={() => { setDetailsOpen(false); navigate('/auth'); }} size="sm" className="w-full text-white font-bold" style={{ backgroundColor: selectedMinistry.color }}>
                      <UserPlus className="h-3.5 w-3.5 mr-2" />Fazer Login para Entrar
                    </Button>
                  ) : joinedMinistries.includes(selectedMinistry.id) ? (
                    <Button
                      onClick={() => toggleJoin(selectedMinistry.id)}
                      disabled={pendingJoinIds.includes(selectedMinistry.id)}
                      size="sm" variant="outline" className="w-full font-bold border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <UserMinus className="h-3.5 w-3.5 mr-2" /> Sair do Ministério
                    </Button>
                  ) : (
                    <Button
                      onClick={() => toggleJoin(selectedMinistry.id)}
                      disabled={pendingJoinIds.includes(selectedMinistry.id)}
                      size="sm" className="w-full text-white font-bold" style={{ backgroundColor: selectedMinistry.color }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" /> Inscrever-se Agora
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Janela de Edição/Criação */}
      <Dialog open={editorOpen} onOpenChange={open => { if (!open) closeEditor() }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingMinistry ? 'Atualizar Atributos do Ministério' : 'Configurar Nova Frente de Ministério'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="font-bold mb-1.5 block text-sm">Nome Oficial *</Label>
              <Input
                value={newMinistry.name}
                onChange={e => setNewMinistry({ ...newMinistry, name: e.target.value.slice(0, NAME_MAX) })}
                placeholder="Ex: Ministério de Comunicação & Mídia"
                className="h-10 border"
              />
              <p className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{newMinistry.name.length}/{NAME_MAX}</p>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Imagem do Núcleo (URL)</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={newMinistry.imageUrl}
                  onChange={e => setNewMinistry({ ...newMinistry, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="h-10 pl-9 border"
                />
              </div>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Descrição Funcional / Propósito</Label>
              <Textarea
                value={newMinistry.description}
                onChange={e => setNewMinistry({ ...newMinistry, description: e.target.value.slice(0, DESCRIPTION_MAX) })}
                placeholder="Escreva as metas estruturais e atribuições gerais deste ministério..."
                rows={3}
                className="resize-none border"
              />
              <p className="text-[10px] font-mono text-muted-foreground mt-1 text-right">{newMinistry.description.length}/{DESCRIPTION_MAX}</p>
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Atividades Principais (Tags separadas por vírgula)</Label>
              <Input
                value={newMinistry.activities}
                onChange={e => setNewMinistry({ ...newMinistry, activities: e.target.value })}
                placeholder="Ex: Design, Filmagem, Transmissão ao vivo"
                className="h-10 border"
              />
            </div>

            <div>
              <Label className="font-bold mb-1.5 block text-sm">Identidade Visual (Cor Temática)</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setNewMinistry({ ...newMinistry, color: preset }); setColorError(null) }}
                    className={`h-7 w-7 rounded-full border-2 transition-transform duration-200 hover:scale-110 ${newMinistry.color === preset ? 'scale-110 border-foreground shadow-sm' : 'border-transparent'}`}
                    style={{ backgroundColor: preset }}
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
              {colorError && <p className="text-xs text-red-500 font-medium mt-1">{colorError}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={closeEditor} variant="outline" className="flex-1 h-10 font-bold" disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={createOrUpdate}
                disabled={saving || !newMinistry.name.trim()}
                className="flex-1 h-10 font-bold text-white shadow-md"
                style={{ backgroundColor: HEX_REGEX.test(newMinistry.color) ? newMinistry.color : '#0A2E4A' }}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Gravando...' : editingMinistry ? 'Atualizar Dados' : 'Criar Novo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent className="rounded-xl border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black tracking-tight">Deseja remover este ministério definitivamente?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Esta ação removerá o registro do banco de dados imediatamente. Todos os vínculos de membros ativos deixarão de mapear este ID.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting} className="font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">
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
