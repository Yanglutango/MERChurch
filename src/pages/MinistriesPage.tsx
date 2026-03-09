import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Users, UserPlus, UserMinus, Plus, Edit2, Trash2, Shield, HandHeart, TrendingUp, Heart, Activity, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const MinistriesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null)
  const [newMinistry, setNewMinistry] = useState({
    name: '',
    description: '',
    color: '#4A90A4',
  })

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadMinistries()
    if (!isGuest) {
      loadJoinedMinistries()
    }
  }, [])

  const loadMinistries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('ministries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading ministries:', error)
      setLoading(false)
      return
    }

    setMinistries(data)
    
    // Load member counts for each ministry
    const counts: Record<string, number> = {}
    for (const ministry of data) {
      const { count } = await supabase
        .from('ministry_members')
        .select('*', { count: 'exact', head: true })
        .eq('ministry_id', ministry.id)
      counts[ministry.id] = count || 0
    }
    setMemberCounts(counts)
    setLoading(false)
  }

  const loadJoinedMinistries = async () => {
    const { data, error } = await supabase
      .from('ministry_members')
      .select('ministry_id')
      .eq('user_id', user!.id)

    if (error) {
      console.error('Error loading joined ministries:', error)
      return
    }

    setJoinedMinistries(data.map((m) => m.ministry_id))
  }

  const createOrUpdateMinistry = async () => {
    if (!newMinistry.name.trim()) {
      toast.error('Nome do ministério é obrigatório')
      return
    }

    if (editingMinistry) {
      const { error } = await supabase
        .from('ministries')
        .update({
          name: newMinistry.name,
          description: newMinistry.description,
          color: newMinistry.color,
        })
        .eq('id', editingMinistry.id)

      if (error) {
        toast.error('Erro ao atualizar ministério')
        return
      }

      toast.success('Ministério atualizado com sucesso!')
    } else {
      const { error } = await supabase.from('ministries').insert({
        name: newMinistry.name,
        description: newMinistry.description,
        color: newMinistry.color,
        leader_id: user!.id,
      })

      if (error) {
        toast.error('Erro ao criar ministério')
        return
      }

      toast.success('Ministério criado com sucesso!')
    }

    setEditorOpen(false)
    setEditingMinistry(null)
    setNewMinistry({ name: '', description: '', color: '#4A90A4' })
    loadMinistries()
  }

  const handleEdit = (ministry: Ministry) => {
    setEditingMinistry(ministry)
    setNewMinistry({
      name: ministry.name,
      description: ministry.description || '',
      color: ministry.color || '#4A90A4',
    })
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ministério?')) return

    const { error } = await supabase.from('ministries').delete().eq('id', id)

    if (error) {
      toast.error('Erro ao excluir ministério')
      return
    }

    toast.success('Ministério excluído com sucesso!')
    loadMinistries()
  }

  const toggleJoin = async (ministryId: string) => {
    const isJoined = joinedMinistries.includes(ministryId)

    if (isJoined) {
      const { error } = await supabase
        .from('ministry_members')
        .delete()
        .eq('ministry_id', ministryId)
        .eq('user_id', user!.id)

      if (error) {
        toast.error('Erro ao sair do ministério')
        return
      }

      setJoinedMinistries(joinedMinistries.filter((id) => id !== ministryId))
      toast.success('Você saiu do ministério')
    } else {
      const { error } = await supabase.from('ministry_members').insert({
        ministry_id: ministryId,
        user_id: user!.id,
      })

      if (error) {
        toast.error('Erro ao entrar no ministério')
        return
      }

      setJoinedMinistries([...joinedMinistries, ministryId])
      toast.success('Bem-vindo ao ministério! 🙏')
    }
    loadMinistries()
  }

  const totalParticipants = Object.values(memberCounts).reduce((sum, count) => sum + count, 0)

  if (loading) {
    return (
      <Layout title="Ministérios">
        <LoadingState fullScreen message="Carregando ministérios..." />
      </Layout>
    )
  }

  return (
    <Layout title="Ministérios">
      <div className="space-y-6">
        {/* Hero Banner - Contextual por Papel */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=600&fit=crop&q=80"
              alt="Ministries"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-green-700/96 via-emerald-700/94 to-teal-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE MINISTÉRIOS' : isGuest ? 'HUB DE SERVIÇO' : 'SEU LUGAR NO CORPO'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Servindo Juntos para a{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Glória de Deus
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Conheça nossos ministérios e descubra onde Deus está chamando você para fazer diferença no corpo de Cristo.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Seu Lugar no{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Corpo
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Participe, sirva e cresça junto com o corpo de Cristo. Cada membro é essencial para a obra.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Gerenciar Ministérios
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Organize, equipe e acompanhe os ministérios da casa. Governo pastoral equilibrado e funcional.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isAdmin && (
                  <AdminAction>
                    <Button
                      onClick={() => { setEditingMinistry(null); setNewMinistry({ name: '', description: '', color: '#4A90A4' }); setEditorOpen(true); }}
                      size="lg"
                      className="bg-white text-green-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Novo Ministério
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-green-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Servir
                  </Button>
                )}
                {!isGuest && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    {joinedMinistries.length} {joinedMinistries.length === 1 ? 'Ministério' : 'Ministérios'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats - Apenas para Member/Admin */}
        {!isGuest && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            <StatCard
              icon={Users}
              label="Ministérios Ativos"
              value={ministries.length}
              gradient="from-green-600 to-emerald-600"
            />
            <StatCard
              icon={HandHeart}
              label={isAdmin ? 'Total de Participantes' : 'Seus Ministérios'}
              value={isAdmin ? totalParticipants : joinedMinistries.length}
              gradient="from-blue-600 to-cyan-600"
            />
            <StatCard
              icon={Activity}
              label="Áreas de Atuação"
              value={ministries.length}
              gradient="from-purple-600 to-pink-600"
            />
          </div>
        )}

        {/* Ministries Grid */}
        {ministries.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                {isGuest ? 'Ministérios Disponíveis' : isAdmin ? 'Todos os Ministérios' : 'Encontre Seu Chamado'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ministries.map((ministry) => {
                const isJoined = joinedMinistries.includes(ministry.id)
                const participantCount = memberCounts[ministry.id] || 0

                return (
                  <Card
                    key={ministry.id}
                    className="group relative p-6 md:p-7 border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 transform duration-300"
                    style={{
                      borderColor: isJoined ? ministry.color : undefined,
                    }}
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div
                        className="inline-flex p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${ministry.color}20` }}
                      >
                        <Users className="h-8 w-8" style={{ color: ministry.color }} />
                      </div>

                      {isAdmin && (
                        <AdminAction>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleEdit(ministry)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(ministry.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {ministry.name}
                    </h3>

                    {ministry.description && (
                      <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                        {ministry.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <HandHeart className="h-4 w-4" style={{ color: ministry.color }} />
                        <span className="font-semibold">{participantCount} {participantCount === 1 ? 'participante' : 'participantes'}</span>
                      </div>
                      {isJoined && !isGuest && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-full">
                          <Activity className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-bold text-primary">Ativo</span>
                        </div>
                      )}
                    </div>

                    {isGuest ? (
                      <Button
                        onClick={() => navigate('/auth')}
                        className="w-full font-semibold group-hover:shadow-lg transition-shadow"
                        style={{ backgroundColor: ministry.color, borderColor: ministry.color, color: 'white' }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar Conta para Servir
                      </Button>
                    ) : (
                      <Button
                        onClick={() => toggleJoin(ministry.id)}
                        className="w-full font-semibold group-hover:shadow-lg transition-shadow"
                        variant={isJoined ? 'default' : 'outline'}
                        style={
                          isJoined
                            ? { backgroundColor: ministry.color, borderColor: ministry.color, color: 'white' }
                            : { borderColor: ministry.color, color: ministry.color }
                        }
                      >
                        {isJoined ? (
                          <>
                            <UserMinus className="h-4 w-4 mr-2" />
                            Sair do Ministério
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Participar
                          </>
                        )}
                      </Button>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && ministries.length > 0 && (
          <GuestPrompt
            title="Faça parte do corpo de Cristo"
            description="Membros podem participar de ministérios, servir ativamente e fazer diferença na vida de outros irmãos."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}

        {/* Empty State */}
        {ministries.length === 0 && (
          <EmptyState
            icon={Users}
            title={isAdmin ? 'Nenhum ministério criado' : 'Nenhum ministério disponível'}
            description={isAdmin ? 'Crie o primeiro ministério da casa' : 'Novos ministérios serão adicionados em breve'}
            action={
              isAdmin ? (
                <AdminAction>
                  <Button
                    onClick={() => { setEditingMinistry(null); setNewMinistry({ name: '', description: '', color: '#4A90A4' }); setEditorOpen(true); }}
                    className="gradient-primary text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Ministério
                  </Button>
                </AdminAction>
              ) : undefined
            }
          />
        )}
      </div>

      {/* Ministry Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingMinistry ? 'Editar Ministério' : 'Criar Novo Ministério'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-base font-semibold">Nome do Ministério *</Label>
              <Input
                id="name"
                value={newMinistry.name}
                onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
                placeholder="Ex: Louvor e Adoração"
                className="h-12 text-base mt-2"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-base font-semibold">Descrição / Propósito</Label>
              <Textarea
                id="description"
                value={newMinistry.description}
                onChange={(e) => setNewMinistry({ ...newMinistry, description: e.target.value })}
                placeholder="Descreva o propósito e chamado deste ministério..."
                rows={5}
                className="text-base mt-2 resize-none"
              />
            </div>
            <div>
              <Label htmlFor="color" className="text-base font-semibold">Cor de Identificação</Label>
              <div className="flex gap-3 mt-2">
                <Input
                  id="color"
                  type="color"
                  value={newMinistry.color}
                  onChange={(e) => setNewMinistry({ ...newMinistry, color: e.target.value })}
                  className="w-24 h-12 cursor-pointer"
                />
                <Input
                  type="text"
                  value={newMinistry.color}
                  onChange={(e) => setNewMinistry({ ...newMinistry, color: e.target.value })}
                  className="flex-1 h-12 font-mono"
                  placeholder="#4A90A4"
                />
              </div>
            </div>
            <Button 
              onClick={createOrUpdateMinistry} 
              className="w-full h-12 text-base font-semibold"
              style={{ backgroundColor: newMinistry.color, color: 'white' }}
            >
              <ChevronRight className="mr-2 h-5 w-5" />
              {editingMinistry ? 'Atualizar Ministério' : 'Criar Ministério'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default MinistriesPage
