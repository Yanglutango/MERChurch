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
import { Users, Plus, UserPlus, Save, Users2, Search, Loader2, Image as ImageIcon, ShieldAlert, Calendar, Info } from 'lucide-react'
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

  // NOVO ESTADO: Controla qual ministério teve os detalhes clicados para abrir o Modal
  const [selectedMinistryForDetails, setSelectedMinistryForDetails] = useState<any | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  const loadMinistries = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select(`
          *, 
          leader:user_profiles(username, avatar_url), 
          ministry_members(user_profiles(username, avatar_url))
        `)
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

      // Atualiza os dados em tempo real caso o modal de detalhes já esteja aberto
      if (selectedMinistryForDetails) {
        const updatedCurrent = formatted.find(m => m.id === selectedMinistryForDetails.id)
        if (updatedCurrent) setSelectedMinistryForDetails(updatedCurrent)
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro inesperado ao carregar ministérios')
    } finally {
      setLoading(false)
    }
  }, [selectedMinistryForDetails])

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

  const loadProfiles = useCallback(async () => {
    if (!isAdmin) return
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username')
        .order('username', { ascending: true })

      if (error) {
        console.error('Erro ao carregar perfis:', error)
        return
      }
      setProfiles(data || [])
    } catch (err) {
      console.error(err)
    }
  }, [isAdmin])

  useEffect(() => {
    loadMinistries()
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
    setNewMinistry({ ...EMPTY_FORM, leaderId: user?.id || '' })
    setColorError(null)
    setEditorOpen(true)
  }, [user?.id])

  const openEdit = useCallback((m: Ministry) => {
    setEditingMinistry(m)
    setNewMinistry({
      name: m.name,
      description: m.description || '',
      color: m.color || '#4A90A4',
      activities: (m as any).activities || '',
      imageUrl: m.imageUrl || '',
      leaderId: m.leaderId || '',
    })
    setColorError(null)
    setEditorOpen(true)
  }, [])

  const canManage = useCallback((m: Ministry) => isAdmin || m.leaderId === user?.id, [isAdmin, user?.id])

  const createOrUpdate = async () => {
    if (!newMinistry.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    if (!newMinistry.leaderId) {
      toast.error('É obrigatório definir um líder para o ministério')
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
        leader_id: newMinistry.leaderId,
      }

      if (editingMinistry) {
        if (!isAdmin) {
          toast.error('Apenas o Administrador-chefe pode redefinir lideranças')
          setSaving(false)
          return
        }

        const { error } = await supabase.from('ministries').update(payload).eq('id', editingMinistry.id)
        if (error) throw error

        toast.success('Ministério atualizado com sucesso!')
        logActivity({ type: 'ministry_updated', actorId: user!.id, actorName: user!.username, title: newMinistry.name, referenceId: editingMinistry.id, referenceType: 'ministry' }).catch(() => null)
      } else {
        const { error } = await supabase.from('ministries').insert(payload)
        if (error) throw error

        toast.success('Ministério criado com sucesso!')
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
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold shadow-sm">
                <UserPlus className="h-4 w-4 mr-1.5" />Criar Conta
              </Button>
            )}
          </div>
        </div>

        {/* Controladores */}
        {ministries.length > 0 && (
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
        )}

        {/* Grid principal */}
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
            title="Nenhum resultado indexado"
            description="Modifique os parâmetros ou termos da pesquisa de filtros."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMinistries.map(ministry => (
              <div 
                key={ministry.id} 
                className="cursor-pointer" 
                onClick={() => setSelectedMinistryForDetails(ministry)} // O clique no cartão agora abre os Detalhes
              >
                <MinistryCard
                  ministry={ministry}
                  isJoined={joinedMinistries.includes(ministry.id)}
                  isPending={pendingJoinIds.includes(ministry.id)}
                  isGuest={isGuest}
                  canManage={canManage(ministry)}
                  isAdmin={isAdmin}
                  onToggleJoin={toggleJoin}
                  onEdit={(m) => { openEdit(m) }}
                  onDelete={setDeleteTargetId}
                  onAuthNavigate={() => navigate('/auth')}
                />
              </div>
            ))}
          </div>
        )}

        {isGuest && ministries.length > 0 && (
          <GuestPrompt
            title="Faça parte da nossa comunidade activa"
            description="Contas integradas permitem a inscrição em ministérios e acompanhamento de funções de liderança."
            actionLabel="Cadastrar-se Agora"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* NOVO MODAL: Exibição Completa de Detalhes do Ministério e Lista de Membros */}
      <Dialog open={!!selectedMinistryForDetails} onOpenChange={open => { if (!open) setSelectedMinistryForDetails(null) }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-xl p-0 border shadow-2xl">
          {selectedMinistryForDetails && (
            <div>
              {/* Banner do Modal */}
              <div 
                className="h-40 relative flex items-center justify-center overflow-hidden bg-muted"
                style={selectedMinistryForDetails.imageUrl ? undefined : { backgroundColor: `${selectedMinistryForDetails.color}22` }}
              >
                {selectedMinistryForDetails.imageUrl ? (
                  <img src={selectedMinistryForDetails.imageUrl} alt={selectedMinistryForDetails.name} className="w-full h-full object-cover" />
                ) : (
                  <Users className="h-16 w-16" style={{ color: selectedMinistryForDetails.color }} />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-xl font-black text-foreground tracking-tight drop-shadow-sm">{selectedMinistryForDetails.name}</h2>
                  {selectedMinistryForDetails.leader?.username && (
                    <p className="text-xs text-muted-foreground font-semibold mt-1">Líder: {selectedMinistryForDetails.leader.username}</p>
                  )}
                </div>
              </div>

              {/* Conteúdo Interno */}
              <div className="p-6 space-y-5">
                {/* Propósito / Descrição sem cortes */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Propósito & Atribuições
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground bg-muted/30 p-3 rounded-lg border border-border/40">
                    {selectedMinistryForDetails.description || 'Nenhuma descrição detalhada fornecida para este núcleo operativo.'}
                  </p>
                </div>

                {/* Lista Nominal Completa dos Membros Inscritos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Membros do Ministério</span>
                    <span className="bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {selectedMinistryForDetails.memberCount} ativos
                    </span>
                  </h4>

                  {selectedMinistryForDetails.membersList.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic p-3 text-center bg-muted/10 rounded-md border border-dashed">
                      Nenhum voluntário integrado a esta equipe até o momento.
                    </p>
                  ) : (
                    <div className="grid gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {selectedMinistryForDetails.membersList.map((member: any, idx: number) => {
                        const profile = member.user_profiles
                        if (!profile) return null
                        return (
                          <div key={idx} className="flex items-center gap-2.5 p-2 bg-card rounded-lg border border-border/60 hover:bg-muted/30 transition-colors">
                            {profile.avatar_url ? (
                              <img src={profile.avatar_url} alt={profile.username} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-[#0A2E4A] text-white text-[10px] font-bold flex items-center justify-center uppercase">
                                {profile.username?.slice(0, 2) || 'MB'}
                              </div>
                            )}
                            <span className="text-xs font-semibold text-foreground">{profile.username}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Ações Inferiores de Inscrição dentro do Modal */}
                <div className="pt-3 border-t flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedMinistryForDetails(null)} className="font-bold">
                    Fechar Janela
                  </Button>
                  {!isGuest && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleJoin(selectedMinistryForDetails.id);
                      }}
                      disabled={pendingJoinIds.includes(selectedMinistryForDetails.id)}
                      className="font-bold text-white"
                      style={{ backgroundColor: selectedMinistryForDetails.color }}
                    >
                      {pendingJoinIds.includes(selectedMinistryForDetails.id) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      {joinedMinistries.includes(selectedMinistryForDetails.id) ? 'Deixar Equipe' : 'Participar Desta Frente'}
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
          <div className="space-y-4 pt-2" onClick={(e) => e.stopPropagation()}> {/* Impede fechar ao clicar no formulário */}
            
            {/* Campo Preservado e Intocado: Seleção Personalizada de Líderes pelo Admin */}
            {isAdmin && (
              <div className="p-3 bg-blue-50/50 dark:bg-slate-900/40 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1.5">
                <Label className="font-bold flex items-center gap-1.5 text-sm text-blue-900 dark:text-blue-400">
                  <ShieldAlert className="h-4 w-4" /> Delegar Líder do Ministério *
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
                <p className="text-[10px] text-muted-foreground">Como administrador master, você pode atribuir a liderança a qualquer pessoa cadastrada.</p>
              </div>
            )}

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
                    aria-label={`Preset ${preset}`}
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
                disabled={saving || !newMinistry.name.trim() || !newMinistry.leaderId}
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
