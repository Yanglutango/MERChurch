import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activityLogger'
import { Users, UserPlus, UserMinus, Plus, Edit2, Trash2, HandHeart, Activity, ChevronRight, Tag, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [newMinistry, setNewMinistry] = useState({ name: '', description: '', color: '#4A90A4', activities: '' })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  // ✅ FIX: Adicionar user e isGuest como dependências
  useEffect(() => {
    loadMinistries()
    if (!isGuest && user?.id) loadJoinedMinistries()
  }, [user?.id, isGuest])

  const loadMinistries = async () => {
    setLoading(true)
    try {
      // ── Single aggregated query to avoid N+1 ─────────────────────────
      const [ministriesRes, countsRes] = await Promise.all([
        supabase.from('ministries').select('*').order('created_at', { ascending: false }),
        supabase.from('ministry_members').select('ministry_id'),
      ])

      // ✅ FIX: Adicionar mensagem de erro específica
      if (ministriesRes.error) {
        console.error('Erro ao carregar ministérios:', ministriesRes.error)
        toast.error(ministriesRes.error.message || 'Erro ao carregar ministérios')
        setLoading(false)
        return
      }

      setMinistries(ministriesRes.data || [])

      // Aggregate counts client-side from a single bulk fetch
      const counts: Record<string, number> = {}
      ;(countsRes.data || []).forEach(row => {
        counts[row.ministry_id] = (counts[row.ministry_id] || 0) + 1
      })
      setMemberCounts(counts)
      setLoading(false)
    } catch (err) {
      console.error('Erro inesperado ao carregar ministérios:', err)
      toast.error('Erro inesperado ao carregar ministérios')
      setLoading(false)
    }
  }

  // ✅ FIX: Adicionar validação de erro
  const loadJoinedMinistries = async () => {
    try {
      const { data, error } = await supabase.from('ministry_members').select('ministry_id').eq('user_id', user!.id)
      
      if (error) {
        console.error('Erro ao carregar ministérios associados:', error)
        return
      }
      
      setJoinedMinistries(data?.map(m => m.ministry_id) || [])
    } catch (err) {
      console.error('Erro inesperado:', err)
    }
  }

  const createOrUpdate = async () => {
    if (!newMinistry.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      if (editingMinistry) {
        // ✅ FIX: Validar permissão antes de atualizar
        if (editingMinistry.leader_id !== user!.id && !isAdmin) {
          toast.error('Apenas o líder ou admin pode editar este ministério')
          return
        }

        const { error } = await supabase.from('ministries').update({
          name: newMinistry.name,
          description: newMinistry.description,
          color: newMinistry.color,
          activities: newMinistry.activities,
        }).eq('id', editingMinistry.id)

        if (error) {
          toast.error(error.message || 'Erro ao atualizar ministério')
          return
        }

        toast.success('Ministério atualizado com sucesso!')
        await logActivity({
          type: 'ministry_updated',
          actorId: user!.id,
          actorName: user!.username,
          title: newMinistry.name,
          referenceId: editingMinistry.id,
          referenceType: 'ministry',
        })
      } else {
        const { error } = await supabase.from('ministries').insert({
          name: newMinistry.name,
          description: newMinistry.description,
          color: newMinistry.color,
          activities: newMinistry.activities,
          leader_id: user!.id,
        })

        if (error) {
          toast.error(error.message || 'Erro ao criar ministério')
          return
        }

        toast.success('Ministério criado com sucesso!')
        await logActivity({
          type: 'ministry_created',
          actorId: user!.id,
          actorName: user!.username,
          title: newMinistry.name,
          referenceId: null,
          referenceType: 'ministry',
        })
      }

      // Reset and reload
      setEditorOpen(false)
      setEditingMinistry(null)
      setNewMinistry({ name: '', description: '', color: '#4A90A4', activities: '' })
      await loadMinistries()
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao processar ministério')
    }
  }

  const handleEdit = (m: Ministry) => {
    // ✅ FIX: Usar type-safe access (sem as any)
    setEditingMinistry(m)
    setNewMinistry({
      name: m.name,
      description: m.description || '',
      color: m.color || '#4A90A4',
      activities: m.activities || '',
    })
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ministério? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const { error } = await supabase.from('ministries').delete().eq('id', id)

      if (error) {
        toast.error(error.message || 'Erro ao excluir ministério')
        return
      }

      toast.success('Ministério excluído com sucesso!')
      await logActivity({
        type: 'ministry_deleted',
        actorId: user!.id,
        actorName: user!.username,
        title: 'Ministério removido',
        referenceId: id,
        referenceType: 'ministry',
      })
      await loadMinistries()
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao excluir ministério')
    }
  }

  // ✅ FIX: Remover loadMinistries() redundante - atualizar state localmente
  const toggleJoin = async (ministryId: string) => {
    const isJoined = joinedMinistries.includes(ministryId)

    try {
      if (isJoined) {
        const { error } = await supabase
          .from('ministry_members')
          .delete()
          .eq('ministry_id', ministryId)
          .eq('user_id', user!.id)

        if (error) {
          toast.error(error.message || 'Erro ao sair do ministério')
          return
        }

        setJoinedMinistries(joinedMinistries.filter(id => id !== ministryId))
        
        // Decrementar contador
        setMemberCounts(prev => ({
          ...prev,
          [ministryId]: Math.max(0, (prev[ministryId] || 0) - 1),
        }))

        toast.success('Você saiu do ministério')
      } else {
        const { error } = await supabase
          .from('ministry_members')
          .insert({ ministry_id: ministryId, user_id: user!.id })

        if (error) {
          toast.error(error.message || 'Erro ao entrar no ministério')
          return
        }

        setJoinedMinistries([...joinedMinistries, ministryId])
        
        // Incrementar contador
        setMemberCounts(prev => ({
          ...prev,
          [ministryId]: (prev[ministryId] || 0) + 1,
        }))

        const ministry = ministries.find(m => m.id === ministryId)
        await logActivity({
          type: 'ministry_joined',
          actorId: user!.id,
          actorName: user!.username,
          title: ministry?.name || 'Ministério',
          referenceId: ministryId,
          referenceType: 'ministry',
        })

        toast.success('Bem-vindo ao ministério! 🙏')
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
      toast.error('Erro inesperado ao processar solicitação')
    }
  }

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
        {/* Compact header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ministérios</h1>
            <p className="text-sm text-muted-foreground">{ministries.length} ministérios ativos</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/groups')} className="text-xs font-semibold">
              <Users2 className="h-3.5 w-3.5 mr-1.5" />Grupos
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingMinistry(null)
                  setNewMinistry({ name: '', description: '', color: '#4A90A4', activities: '' })
                  setEditorOpen(true)
                }}
                className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold"
              >
                <Plus className="h-4 w-4 mr-1.5" />Criar Ministério
              </Button>
            )}
            {isGuest && (
              <Button
                size="sm"
                onClick={() => navigate('/auth')}
                className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold"
              >
                <UserPlus className="h-4 w-4 mr-1.5" />Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Ministry Grid */}
        {ministries.length === 0 ? (
          <EmptyState
            icon={Users}
            title={isAdmin ? 'Nenhum ministério criado' : 'Nenhum ministério disponível'}
            description={isAdmin ? 'Crie o primeiro ministério da casa' : 'Novos ministérios em breve'}
            action={
              isAdmin ? (
                <Button onClick={() => setEditorOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                  <Plus className="mr-2 h-4 w-4" />Criar Ministério
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ministries.map(ministry => {
              const isJoined = joinedMinistries.includes(ministry.id)
              const count = memberCounts[ministry.id] || 0

              return (
                <Card
                  key={ministry.id}
                  className="group relative p-5 border hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200"
                  style={{ borderTopColor: ministry.color, borderTopWidth: '3px' }}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="inline-flex p-2.5 rounded-xl shadow-sm" style={{ backgroundColor: `${ministry.color}20` }}>
                        <Users className="h-5 w-5" style={{ color: ministry.color }} />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(ministry)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(ministry.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {ministry.name}
                      </h3>
                      {ministry.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {ministry.description}
                        </p>
                      )}
                      {ministry.activities && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Tag className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: ministry.color }} />
                          <span className="line-clamp-1">{ministry.activities}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HandHeart className="h-3.5 w-3.5" style={{ color: ministry.color }} />
                        <span className="font-semibold">{count} {count === 1 ? 'participante' : 'participantes'}</span>
                      </div>
                      {isJoined && !isGuest && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <Activity className="h-2.5 w-2.5 text-green-600 dark:text-green-400" />
                          <span className="text-[10px] font-bold text-green-600 dark:text-green-400">Ativo</span>
                        </div>
                      )}
                    </div>

                    {isGuest ? (
                      <Button
                        onClick={() => navigate('/auth')}
                        size="sm"
                        className="w-full text-white font-semibold"
                        style={{ backgroundColor: ministry.color }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />Criar Conta para Servir
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggleJoin(ministry.id)}
                        size="sm"
                        className="w-full font-semibold"
                        variant={isJoined ? 'default' : 'outline'}
                        style={
                          isJoined
                            ? { backgroundColor: ministry.color, borderColor: ministry.color, color: 'white' }
                            : { borderColor: ministry.color, color: ministry.color }
                        }
                      >
                        {isJoined ? (
                          <>
                            <UserMinus className="h-3.5 w-3.5 mr-1.5" />Sair
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />Participar
                          </>
                        )}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
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
                onChange={e => setNewMinistry({ ...newMinistry, name: e.target.value })}
                placeholder="Ex: Louvor e Adoração"
                className="h-10 border"
              />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição</Label>
              {/* ✅ FIX: Completar atributo className */}
              <Textarea
                value={newMinistry.description}
                onChange={e => setNewMinistry({ ...newMinistry, description: e.target.value })}
                placeholder="Propósito deste ministério..."
                rows={3}
                className="h-auto border"
              />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Atividades</Label>
              {/* ✅ FIX: Completar atributo className */}
              <Input
                value={newMinistry.activities}
                onChange={e => setNewMinistry({ ...newMinistry, activities: e.target.value })}
                placeholder="Ex: Ensaios, cultos, visitas..."
                className="h-10 border"
              />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Cor</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newMinistry.color}
                  onChange={e => setNewMinistry({ ...newMinistry, color: e.target.value })}
                  className="w-16 h-10 cursor-pointer border"
                />
                <Input
                  value={newMinistry.color}
                  onChange={e => setNewMinistry({ ...newMinistry, color: e.target.value })}
                  className="flex-1 h-10 font-mono border"
                  placeholder="#4A90A4"
                />
              </div>
            </div>
            <Button onClick={createOrUpdate} className="w-full h-10 font-bold text-white" style={{ backgroundColor: newMinistry.color }}>
              <ChevronRight className="mr-2 h-4 w-4" />
              {editingMinistry ? 'Atualizar' : 'Criar Ministério'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default MinistriesPage
