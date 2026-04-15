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
import { Users, UserPlus, UserMinus, Plus, Edit2, Trash2, Shield, HandHeart, Activity, ChevronRight, Tag, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const MINISTRY_ICONS = ['🎵', '🙏', '📖', '❤️', '🌍', '⚽', '🎨', '🤝', '👶', '🏥']

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

  useEffect(() => {
    loadMinistries()
    if (!isGuest) loadJoinedMinistries()
  }, [])

  const loadMinistries = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('ministries').select('*').order('created_at', { ascending: false })
    if (error) { console.error(error); setLoading(false); return }
    setMinistries(data)
    const counts: Record<string, number> = {}
    await Promise.all(data.map(async (m) => {
      const { count } = await supabase.from('ministry_members').select('*', { count: 'exact', head: true }).eq('ministry_id', m.id)
      counts[m.id] = count || 0
    }))
    setMemberCounts(counts)
    setLoading(false)
  }

  const loadJoinedMinistries = async () => {
    const { data } = await supabase.from('ministry_members').select('ministry_id').eq('user_id', user!.id)
    setJoinedMinistries(data?.map(m => m.ministry_id) || [])
  }

  const createOrUpdate = async () => {
    if (!newMinistry.name.trim()) { toast.error('Nome é obrigatório'); return }
    if (editingMinistry) {
      const { error } = await supabase.from('ministries').update({
        name: newMinistry.name, description: newMinistry.description, color: newMinistry.color, activities: newMinistry.activities,
      }).eq('id', editingMinistry.id)
      if (error) { toast.error('Erro ao atualizar'); return }
      toast.success('Ministério atualizado!')
    } else {
      const { error } = await supabase.from('ministries').insert({
        name: newMinistry.name, description: newMinistry.description, color: newMinistry.color, activities: newMinistry.activities, leader_id: user!.id,
      })
      if (error) { toast.error('Erro ao criar'); return }
      toast.success('Ministério criado!')
    }
    setEditorOpen(false)
    setEditingMinistry(null)
    setNewMinistry({ name: '', description: '', color: '#4A90A4', activities: '' })
    loadMinistries()
  }

  const handleEdit = (m: Ministry) => {
    setEditingMinistry(m)
    setNewMinistry({ name: m.name, description: m.description || '', color: m.color || '#4A90A4', activities: (m as any).activities || '' })
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este ministério?')) return
    const { error } = await supabase.from('ministries').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir'); return }
    toast.success('Ministério excluído!')
    loadMinistries()
  }

  const toggleJoin = async (ministryId: string) => {
    const isJoined = joinedMinistries.includes(ministryId)
    if (isJoined) {
      const { error } = await supabase.from('ministry_members').delete().eq('ministry_id', ministryId).eq('user_id', user!.id)
      if (error) { toast.error('Erro ao sair'); return }
      setJoinedMinistries(joinedMinistries.filter(id => id !== ministryId))
      toast.success('Você saiu do ministério')
    } else {
      const { error } = await supabase.from('ministry_members').insert({ ministry_id: ministryId, user_id: user!.id })
      if (error) { toast.error('Erro ao entrar'); return }
      setJoinedMinistries([...joinedMinistries, ministryId])
      toast.success('Bem-vindo ao ministério! 🙏')
    }
    loadMinistries()
  }

  const totalParticipants = Object.values(memberCounts).reduce((a, b) => a + b, 0)

  if (loading) return <Layout title="Ministérios"><LoadingState fullScreen message="Carregando ministérios..." /></Layout>

  return (
    <Layout title="Ministérios">
      <div className="space-y-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=600&fit=crop&q=80" alt="Ministries" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-green-700/96 via-emerald-700/94 to-teal-700/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE MINISTÉRIOS' : isGuest ? 'HUB DE SERVIÇO' : 'SEU LUGAR NO CORPO'}
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                Servindo Juntos para a{' '}
                <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Glória de Deus</span>
              </h1>
              <p className="text-base md:text-xl text-white/90 font-medium leading-relaxed max-w-2xl">
                {isGuest ? 'Conheça nossos ministérios e descubra onde Deus está chamando você.' : isAdmin ? 'Organize, equipe e acompanhe os ministérios da casa com visão pastoral.' : 'Participe, sirva e cresça junto com o corpo de Cristo. Cada membro é essencial.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {isAdmin && (
                  <AdminAction>
                    <Button onClick={() => { setEditingMinistry(null); setNewMinistry({ name: '', description: '', color: '#4A90A4', activities: '' }); setEditorOpen(true) }} size="lg" className="bg-white text-green-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all">
                      <Plus className="mr-2 h-5 w-5" />Criar Ministério
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-green-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl">
                    <UserPlus className="mr-2 h-5 w-5" />Criar Conta para Servir
                  </Button>
                )}
                {!isGuest && (
                  <Button size="lg" variant="outline" className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full">
                    <HandHeart className="mr-2 h-5 w-5" />
                    {joinedMinistries.length} {joinedMinistries.length === 1 ? 'Ministério' : 'Ministérios'}
                  </Button>
                )}
                <Button size="lg" variant="outline" className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full" onClick={() => navigate('/groups')}>
                  <Users2 className="mr-2 h-5 w-5" />Ver Grupos & Células
                </Button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        {!isGuest && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard icon={Users} label="Ministérios Ativos" value={ministries.length} gradient="from-green-600 to-emerald-600" />
            <StatCard icon={HandHeart} label={isAdmin ? 'Total de Participantes' : 'Seus Ministérios'} value={isAdmin ? totalParticipants : joinedMinistries.length} gradient="from-blue-600 to-cyan-600" />
            <StatCard icon={Activity} label="Total de Membros" value={totalParticipants} gradient="from-purple-600 to-pink-600" />
          </div>
        )}

        {/* Ministry Grid */}
        {ministries.length === 0 ? (
          <EmptyState icon={Users} title={isAdmin ? 'Nenhum ministério criado' : 'Nenhum ministério disponível'} description={isAdmin ? 'Crie o primeiro ministério da casa' : 'Novos ministérios em breve'} action={isAdmin ? (
            <AdminAction><Button onClick={() => setEditorOpen(true)} className="gradient-primary text-white"><Plus className="mr-2 h-4 w-4" />Criar Ministério</Button></AdminAction>
          ) : undefined} />
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-md">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              {isGuest ? 'Ministérios da Igreja' : isAdmin ? 'Todos os Ministérios' : 'Encontre Seu Chamado'}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {ministries.map(ministry => {
                const isJoined = joinedMinistries.includes(ministry.id)
                const count = memberCounts[ministry.id] || 0
                return (
                  <Card key={ministry.id} className="group relative p-5 md:p-6 border-2 hover:shadow-xl transition-all hover:-translate-y-1 transform duration-300" style={{ borderColor: isJoined ? ministry.color : undefined }}>
                    {/* Color accent top bar */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: ministry.color }} />
                    <div className="pt-2 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="inline-flex p-3 md:p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: `${ministry.color}20` }}>
                          <Users className="h-6 w-6 md:h-8 md:w-8" style={{ color: ministry.color }} />
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(ministry)} className="h-8 w-8 p-0"><Edit2 className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(ministry.id)} className="h-8 w-8 p-0"><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors">{ministry.name}</h3>
                        {ministry.description && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">{ministry.description}</p>}
                        {(ministry as any).activities && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-3">
                            <Tag className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: ministry.color }} />
                            <span className="line-clamp-1">{(ministry as any).activities}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <HandHeart className="h-4 w-4" style={{ color: ministry.color }} />
                          <span className="font-semibold">{count} {count === 1 ? 'participante' : 'participantes'}</span>
                        </div>
                        {isJoined && !isGuest && (
                          <div className="flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <Activity className="h-3 w-3 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-bold text-green-600 dark:text-green-400">Ativo</span>
                          </div>
                        )}
                      </div>
                      {isGuest ? (
                        <Button onClick={() => navigate('/auth')} className="w-full font-semibold text-white" style={{ backgroundColor: ministry.color }}>
                          <UserPlus className="h-4 w-4 mr-2" />Criar Conta para Servir
                        </Button>
                      ) : (
                        <Button onClick={() => toggleJoin(ministry.id)} className="w-full font-semibold" variant={isJoined ? 'default' : 'outline'}
                          style={isJoined ? { backgroundColor: ministry.color, borderColor: ministry.color, color: 'white' } : { borderColor: ministry.color, color: ministry.color }}>
                          {isJoined ? <><UserMinus className="h-4 w-4 mr-2" />Sair do Ministério</> : <><UserPlus className="h-4 w-4 mr-2" />Participar</>}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {isGuest && ministries.length > 0 && (
          <GuestPrompt title="Faça parte do corpo de Cristo" description="Membros podem participar de ministérios, servir ativamente e fazer diferença na vida de outros." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{editingMinistry ? 'Editar Ministério' : 'Criar Novo Ministério'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Nome *</Label>
              <Input value={newMinistry.name} onChange={e => setNewMinistry({ ...newMinistry, name: e.target.value })} placeholder="Ex: Louvor e Adoração" className="h-11 border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição</Label>
              <Textarea value={newMinistry.description} onChange={e => setNewMinistry({ ...newMinistry, description: e.target.value })} placeholder="Propósito e chamado deste ministério..." rows={3} className="resize-none border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Atividades</Label>
              <Input value={newMinistry.activities} onChange={e => setNewMinistry({ ...newMinistry, activities: e.target.value })} placeholder="Ex: Ensaios, cultos, visitas..." className="h-11 border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Cor</Label>
              <div className="flex gap-3">
                <Input type="color" value={newMinistry.color} onChange={e => setNewMinistry({ ...newMinistry, color: e.target.value })} className="w-20 h-11 cursor-pointer border-2" />
                <Input type="text" value={newMinistry.color} onChange={e => setNewMinistry({ ...newMinistry, color: e.target.value })} className="flex-1 h-11 font-mono border-2" placeholder="#4A90A4" />
              </div>
            </div>
            <Button onClick={createOrUpdate} className="w-full h-11 font-bold text-white" style={{ backgroundColor: newMinistry.color }}>
              <ChevronRight className="mr-2 h-4 w-4" />
              {editingMinistry ? 'Atualizar Ministério' : 'Criar Ministério'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default MinistriesPage
