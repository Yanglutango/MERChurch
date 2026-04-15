import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  Users, MapPin, Plus, LogIn, LogOut, MessageCircle, Calendar,
  Send, ChevronRight, Search, Shield, UserPlus, X, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

interface SmallGroup {
  id: string
  name: string
  description: string | null
  category: string | null
  region: string | null
  leader_id: string | null
  max_members: number | null
  meeting_schedule: string | null
  is_active: boolean
  created_at: string
  member_count?: number
}

interface GroupMessage {
  id: string
  group_id: string
  user_id: string
  message: string
  created_at: string
  user?: { username: string; avatar_url: string | null }
}

interface GroupMeeting {
  id: string
  group_id: string
  title: string
  description: string | null
  meeting_date: string
  location: string | null
}

const CATEGORIES = [
  { value: 'bible_study', label: 'Estudo Bíblico' },
  { value: 'prayer', label: 'Oração' },
  { value: 'youth', label: 'Jovens' },
  { value: 'women', label: 'Mulheres' },
  { value: 'men', label: 'Homens' },
  { value: 'family', label: 'Família' },
  { value: 'discipleship', label: 'Discipulado' },
]

const GroupsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [groups, setGroups] = useState<SmallGroup[]>([])
  const [myGroupIds, setMyGroupIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [selectedGroup, setSelectedGroup] = useState<SmallGroup | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [meetings, setMeetings] = useState<GroupMeeting[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [chatView, setChatView] = useState<'chat' | 'meetings'>('chat')
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', description: '', category: '', region: '', meeting_schedule: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadGroups()
    if (!isGuest) loadMyGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id)
      loadMeetings(selectedGroup.id)
      const interval = setInterval(() => loadMessages(selectedGroup.id), 10000)
      return () => clearInterval(interval)
    }
  }, [selectedGroup])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadGroups = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('small_groups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) { console.error(error); setLoading(false); return }

    // Load member counts
    const groupsWithCounts = await Promise.all(
      (data || []).map(async (g) => {
        const { count } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', g.id)
        return { ...g, member_count: count || 0 }
      })
    )
    setGroups(groupsWithCounts)
    setLoading(false)
  }

  const loadMyGroups = async () => {
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user!.id)
    setMyGroupIds(data?.map(m => m.group_id) || [])
  }

  const loadMessages = async (groupId: string) => {
    const { data } = await supabase
      .from('group_messages')
      .select('*, user:user_profiles(username, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages((data as any) || [])
  }

  const loadMeetings = async (groupId: string) => {
    const { data } = await supabase
      .from('group_meetings')
      .select('*')
      .eq('group_id', groupId)
      .gte('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(10)
    setMeetings(data || [])
  }

  const joinGroup = async (groupId: string) => {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user!.id })
    if (error) { toast.error('Erro ao entrar no grupo'); return }
    setMyGroupIds([...myGroupIds, groupId])
    loadGroups()
    toast.success('Bem-vindo ao grupo! 🙏')
  }

  const leaveGroup = async (groupId: string) => {
    const { error } = await supabase.from('group_members').delete()
      .eq('group_id', groupId).eq('user_id', user!.id)
    if (error) { toast.error('Erro ao sair do grupo'); return }
    setMyGroupIds(myGroupIds.filter(id => id !== groupId))
    if (selectedGroup?.id === groupId) setSelectedGroup(null)
    loadGroups()
    toast.success('Você saiu do grupo')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !selectedGroup) return
    setSendingMessage(true)
    const { error } = await supabase.from('group_messages').insert({
      group_id: selectedGroup.id,
      user_id: user!.id,
      message: newMessage.trim(),
    })
    if (error) { toast.error('Erro ao enviar mensagem'); setSendingMessage(false); return }
    setNewMessage('')
    loadMessages(selectedGroup.id)
    setSendingMessage(false)
  }

  const createGroup = async () => {
    if (!newGroup.name.trim()) { toast.error('Nome é obrigatório'); return }
    const { error } = await supabase.from('small_groups').insert({
      name: newGroup.name,
      description: newGroup.description || null,
      category: newGroup.category || null,
      region: newGroup.region || null,
      meeting_schedule: newGroup.meeting_schedule || null,
      leader_id: user!.id,
    })
    if (error) { toast.error('Erro ao criar grupo'); return }
    toast.success('Grupo criado com sucesso!')
    setCreateOpen(false)
    setNewGroup({ name: '', description: '', category: '', region: '', meeting_schedule: '' })
    loadGroups()
  }

  const getCategoryLabel = (cat: string | null) =>
    CATEGORIES.find(c => c.value === cat)?.label || cat || 'Geral'

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.region || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || g.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const isMemberOf = (groupId: string) => myGroupIds.includes(groupId)

  if (loading) return <Layout title="Grupos & Células"><LoadingState fullScreen message="Carregando grupos..." /></Layout>

  return (
    <Layout title="Grupos & Células">
      <div className="space-y-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&h=600&fit=crop&q=80" alt="Small Groups" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-violet-700/96 via-purple-700/94 to-indigo-700/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Users className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">GRUPOS & CÉLULAS</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                Comunidade em{' '}
                <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Células</span>
              </h1>
              <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed max-w-2xl">
                Conecte-se em grupos pequenos por região ou interesse. Estude, ore e cresça junto com irmãos próximos.
              </p>
              <div className="flex flex-wrap gap-3">
                {!isGuest && (
                  <AdminAction>
                    <Button onClick={() => setCreateOpen(true)} size="lg" className="bg-white text-violet-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all">
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Grupo
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button onClick={() => navigate('/auth')} size="lg" className="bg-white text-violet-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl">
                    <UserPlus className="mr-2 h-5 w-5" />
                    Entrar para Participar
                  </Button>
                )}
                {!isGuest && (
                  <Button size="lg" variant="outline" className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full">
                    <Users className="mr-2 h-5 w-5" />
                    {myGroupIds.length} {myGroupIds.length === 1 ? 'Grupo' : 'Grupos'} Meus
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Groups List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search & Filter */}
            <Card className="p-4 border-2">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar grupo ou região..." className="pl-9 h-10 border-2" />
                </div>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full h-10 rounded-md border-2 border-input bg-background px-3 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="all">Todas as Categorias</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </Card>

            {/* Groups */}
            <div className="space-y-3">
              {filteredGroups.length === 0 ? (
                <EmptyState icon={Users} title="Nenhum grupo encontrado" description={isAdmin ? 'Crie o primeiro grupo da comunidade' : 'Aguarde novos grupos'} />
              ) : (
                filteredGroups.map(group => {
                  const isMember = isMemberOf(group.id)
                  const isSelected = selectedGroup?.id === group.id
                  return (
                    <Card
                      key={group.id}
                      className={`p-4 border-2 cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20' : 'hover:border-violet-300'}`}
                      onClick={() => {
                        if (!isGuest) setSelectedGroup(group)
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-foreground text-sm leading-tight">{group.name}</h3>
                            {isMember && (
                              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">Membro</span>
                            )}
                          </div>
                          {group.category && (
                            <span className="inline-block px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold rounded-full mb-2">
                              {getCategoryLabel(group.category)}
                            </span>
                          )}
                          {group.region && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <MapPin className="h-3 w-3" />
                              {group.region}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                          </div>
                        </div>
                        {!isGuest && (
                          <Button
                            size="sm"
                            variant={isMember ? 'outline' : 'default'}
                            onClick={e => { e.stopPropagation(); isMember ? leaveGroup(group.id) : joinGroup(group.id) }}
                            className={`flex-shrink-0 h-8 px-3 text-xs font-bold ${isMember ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}
                          >
                            {isMember ? <><LogOut className="h-3 w-3 mr-1" />Sair</> : <><LogIn className="h-3 w-3 mr-1" />Entrar</>}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })
              )}
            </div>

            {isGuest && groups.length > 0 && (
              <GuestPrompt title="Faça parte de um grupo" description="Membros podem entrar em grupos, participar do chat e se conectar com irmãos da região." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
            )}
          </div>

          {/* Chat / Meeting Panel */}
          <div className="lg:col-span-2">
            {!selectedGroup ? (
              <Card className="h-full min-h-[500px] flex items-center justify-center border-2 border-dashed">
                <div className="text-center space-y-4 p-8">
                  <div className="inline-flex p-6 bg-violet-50 dark:bg-violet-950/20 rounded-3xl">
                    <MessageCircle className="h-16 w-16 text-violet-400" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Selecione um Grupo</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">{isGuest ? 'Crie uma conta para participar dos grupos.' : 'Escolha um grupo na lista ao lado para ver o chat e as reuniões.'}</p>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col border-2 shadow-xl" style={{ height: '600px' }}>
                {/* Group Header */}
                <div className="p-4 border-b-2 border-border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-md">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{selectedGroup.name}</h3>
                        <p className="text-xs text-muted-foreground">{selectedGroup.member_count} membros • {getCategoryLabel(selectedGroup.category)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={chatView === 'chat' ? 'default' : 'outline'} onClick={() => setChatView('chat')} className="h-8 px-3 text-xs font-bold">
                        <MessageCircle className="h-3 w-3 mr-1" />Chat
                      </Button>
                      <Button size="sm" variant={chatView === 'meetings' ? 'default' : 'outline'} onClick={() => setChatView('meetings')} className="h-8 px-3 text-xs font-bold">
                        <Calendar className="h-3 w-3 mr-1" />Reuniões
                      </Button>
                      <button onClick={() => setSelectedGroup(null)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>

                {chatView === 'chat' ? (
                  <>
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-background to-muted/10">
                      {!isMemberOf(selectedGroup.id) ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Entre no grupo para ver o chat</p>
                            <Button onClick={() => joinGroup(selectedGroup.id)} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                              <LogIn className="h-4 w-4 mr-2" />Entrar no Grupo
                            </Button>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda. Seja o primeiro!</p>
                          </div>
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isOwn = msg.user_id === user?.id
                          return (
                            <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm ${isOwn ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-primary to-secondary'}`}>
                                {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                {!isOwn && <span className="text-xs font-semibold text-muted-foreground px-2">{msg.user?.username || 'Membro'}</span>}
                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${isOwn ? 'bg-violet-600 text-white rounded-tr-md' : 'bg-muted text-foreground rounded-tl-md'}`}>
                                  {msg.message}
                                </div>
                                <span className="text-xs text-muted-foreground px-2">
                                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    {isMemberOf(selectedGroup.id) && (
                      <div className="p-3 border-t-2 border-border bg-background">
                        <div className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Compartilhe uma mensagem com o grupo..."
                            className="flex-1 h-10 border-2 focus:border-violet-500"
                          />
                          <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()} className="h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Meetings View */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {meetings.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-3">
                          <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                          <p className="text-sm text-muted-foreground">Nenhuma reunião agendada</p>
                        </div>
                      </div>
                    ) : (
                      meetings.map(meeting => (
                        <Card key={meeting.id} className="p-4 border-2 hover:border-violet-300 transition-colors">
                          <h4 className="font-bold text-foreground mb-2">{meeting.title}</h4>
                          {meeting.description && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{meeting.description}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(meeting.meeting_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(meeting.meeting_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {meeting.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {meeting.location}
                              </div>
                            )}
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Nome do Grupo *</Label>
              <Input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Ex: Estudo Bíblico do Bairro Norte" className="h-11 border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição</Label>
              <Textarea value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Propósito e foco do grupo..." rows={3} className="resize-none border-2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold mb-1 block">Categoria</Label>
                <select
                  value={newGroup.category}
                  onChange={e => setNewGroup({ ...newGroup, category: e.target.value })}
                  className="w-full h-11 rounded-md border-2 border-input bg-background px-3 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Selecione</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="font-semibold mb-1 block">Região</Label>
                <Input value={newGroup.region} onChange={e => setNewGroup({ ...newGroup, region: e.target.value })} placeholder="Ex: Bairro Norte" className="h-11 border-2" />
              </div>
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Horário de Reunião</Label>
              <Input value={newGroup.meeting_schedule} onChange={e => setNewGroup({ ...newGroup, meeting_schedule: e.target.value })} placeholder="Ex: Sábados às 15h" className="h-11 border-2" />
            </div>
            <Button onClick={createGroup} className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-bold">
              <Plus className="mr-2 h-4 w-4" />
              Criar Grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default GroupsPage
