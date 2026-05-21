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
import { logActivity } from '../lib/activityLogger'
import {
  Users, MapPin, Plus, LogIn, LogOut, MessageCircle, Calendar,
  Send, Search, UserPlus, X, Clock, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

interface SmallGroup {
  id: string; name: string; description: string | null; category: string | null
  region: string | null; leader_id: string | null; max_members: number | null
  meeting_schedule: string | null; is_active: boolean; created_at: string; member_count?: number
}
interface GroupMessage {
  id: string; group_id: string; user_id: string; message: string; created_at: string
  user?: { username: string; avatar_url: string | null }
}
interface GroupMeeting {
  id: string; group_id: string; title: string; description: string | null
  meeting_date: string; location: string | null
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

  // Mobile-first two-screen pattern
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')

  const isGuest = user?.role === 'guest'

  useEffect(() => { loadGroups(); if (!isGuest) loadMyGroups() }, [])

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id)
      loadMeetings(selectedGroup.id)
      const interval = setInterval(() => loadMessages(selectedGroup.id), 10000)
      return () => clearInterval(interval)
    }
  }, [selectedGroup])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadGroups = async () => {
    setLoading(true)
    const { data } = await supabase.from('small_groups').select('*').eq('is_active', true).order('created_at', { ascending: false })
    const groupsWithCounts = await Promise.all(
      (data || []).map(async g => {
        const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id)
        return { ...g, member_count: count || 0 }
      })
    )
    setGroups(groupsWithCounts)
    setLoading(false)
  }

  const loadMyGroups = async () => {
    const { data } = await supabase.from('group_members').select('group_id').eq('user_id', user!.id)
    setMyGroupIds(data?.map(m => m.group_id) || [])
  }

  const loadMessages = async (groupId: string) => {
    const { data } = await supabase.from('group_messages')
      .select('*, user:user_profiles(username, avatar_url)')
      .eq('group_id', groupId).order('created_at', { ascending: true }).limit(100)
    setMessages((data as any) || [])
  }

  const loadMeetings = async (groupId: string) => {
    const { data } = await supabase.from('group_meetings').select('*').eq('group_id', groupId)
      .gte('meeting_date', new Date().toISOString()).order('meeting_date', { ascending: true }).limit(10)
    setMeetings(data || [])
  }

  const selectGroup = (group: SmallGroup) => {
    if (isGuest) return
    setSelectedGroup(group)
    setMobileView('chat')
  }

  const goBack = () => { setMobileView('list'); setSelectedGroup(null) }

  const joinGroup = async (groupId: string) => {
    const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user!.id })
    if (error) { toast.error('Erro ao entrar no grupo'); return }
    setMyGroupIds([...myGroupIds, groupId])
    loadGroups()
    toast.success('Bem-vindo ao grupo! 🙏')
  }

  const leaveGroup = async (groupId: string) => {
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user!.id)
    if (error) { toast.error('Erro ao sair do grupo'); return }
    setMyGroupIds(myGroupIds.filter(id => id !== groupId))
    if (selectedGroup?.id === groupId) { setSelectedGroup(null); setMobileView('list') }
    loadGroups()
    toast.success('Você saiu do grupo')
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage || !selectedGroup) return
    setSendingMessage(true)
    const { error } = await supabase.from('group_messages').insert({ group_id: selectedGroup.id, user_id: user!.id, message: newMessage.trim() })
    if (error) { toast.error('Erro ao enviar mensagem'); setSendingMessage(false); return }
    setNewMessage('')
    loadMessages(selectedGroup.id)
    setSendingMessage(false)
  }

  const createGroup = async () => {
    if (!newGroup.name.trim()) { toast.error('Nome é obrigatório'); return }
    const { data, error } = await supabase.from('small_groups').insert({
      name: newGroup.name, description: newGroup.description || null, category: newGroup.category || null,
      region: newGroup.region || null, meeting_schedule: newGroup.meeting_schedule || null, leader_id: user!.id,
    }).select().single()
    if (error) { toast.error('Erro ao criar grupo'); return }
    await logActivity({ type: 'group_created', actorId: user!.id, actorName: user!.username, title: newGroup.name, referenceId: data?.id, referenceType: 'group' })
    if (data?.id) await supabase.from('group_members').insert({ group_id: data.id, user_id: user!.id, role: 'leader' })
    toast.success('Grupo criado com sucesso!')
    setCreateOpen(false)
    setNewGroup({ name: '', description: '', category: '', region: '', meeting_schedule: '' })
    loadGroups(); loadMyGroups()
  }

  const getCategoryLabel = (cat: string | null) => CATEGORIES.find(c => c.value === cat)?.label || cat || 'Geral'
  const isMemberOf = (groupId: string) => myGroupIds.includes(groupId)
  const filteredGroups = groups.filter(g => {
    const q = searchTerm.toLowerCase()
    const matchSearch = g.name.toLowerCase().includes(q) || (g.region || '').toLowerCase().includes(q)
    const matchCat = filterCategory === 'all' || g.category === filterCategory
    return matchSearch && matchCat
  })

  if (loading) return <Layout title="Grupos & Células"><LoadingState fullScreen message="Carregando grupos..." /></Layout>

  return (
    <Layout title="Grupos & Células">
      <div className="space-y-5">
        {/* Compact page header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Grupos & Células</h1>
            <p className="text-sm text-muted-foreground">Conecte-se em comunidade por região e interesse</p>
          </div>
          <div className="flex gap-2">
            {!isGuest && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <Plus className="h-4 w-4 mr-1.5" /> Criar Grupo
              </Button>
            )}
            {isGuest && (
              <Button onClick={() => navigate('/auth')} size="sm" className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-1.5" /> Entrar
              </Button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Groups List ── hidden on mobile when chat view */}
          <div className={`lg:col-span-1 space-y-3 ${mobileView === 'chat' ? 'hidden lg:block' : 'block'}`}>
            {/* Search & Filter */}
            <Card className="p-3 border">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar grupo ou região..." className="pl-9 h-9" />
                </div>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary">
                  <option value="all">Todas as Categorias</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </Card>

            {/* Group cards */}
            <div className="space-y-2">
              {filteredGroups.length === 0
                ? <EmptyState icon={Users} title="Nenhum grupo encontrado" description="Aguarde novos grupos ou crie o primeiro" />
                : filteredGroups.map(group => {
                  const isMember = isMemberOf(group.id)
                  const isSelected = selectedGroup?.id === group.id
                  return (
                    <Card key={group.id}
                      className={`p-3 border cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-[#0A2E4A] bg-[#0A2E4A]/5' : 'hover:border-[#4A90A4]/50'}`}
                      onClick={() => selectGroup(group)}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h3 className="font-semibold text-foreground text-sm leading-tight">{group.name}</h3>
                            {isMember && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold rounded-full">Membro</span>}
                          </div>
                          {group.category && <span className="inline-block px-1.5 py-0.5 bg-[#0A2E4A]/10 text-[#0A2E4A] dark:text-[#7bbdd4] text-[10px] font-semibold rounded-full mb-1">{getCategoryLabel(group.category)}</span>}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            {group.region && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{group.region}</span>}
                            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{group.member_count}</span>
                          </div>
                        </div>
                        {!isGuest && (
                          <Button size="sm" variant={isMember ? 'outline' : 'default'}
                            onClick={e => { e.stopPropagation(); isMember ? leaveGroup(group.id) : joinGroup(group.id) }}
                            className={`flex-shrink-0 h-7 px-2 text-[11px] font-bold ${isMember ? 'border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20' : 'bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white'}`}>
                            {isMember ? <><LogOut className="h-3 w-3 mr-0.5" />Sair</> : <><LogIn className="h-3 w-3 mr-0.5" />Entrar</>}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })
              }
            </div>

            {isGuest && groups.length > 0 && (
              <GuestPrompt title="Faça parte de um grupo" description="Membros podem entrar em grupos e participar do chat." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
            )}
          </div>

          {/* ── Chat Panel ── hidden on mobile when list view */}
          <div className={`lg:col-span-2 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            {!selectedGroup ? (
              <Card className="h-full min-h-[400px] flex items-center justify-center border border-dashed">
                <div className="text-center space-y-3 p-8">
                  <div className="inline-flex p-5 bg-muted rounded-2xl">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <h3 className="font-semibold text-foreground">Selecione um grupo</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {isGuest ? 'Crie uma conta para participar dos grupos.' : 'Escolha um grupo ao lado para ver o chat e reuniões.'}
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col border shadow-md" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
                {/* Group header */}
                <div className="p-3 border-b border-border flex items-center justify-between gap-2 bg-muted/30">
                  <div className="flex items-center gap-2">
                    {/* Back button (mobile only) */}
                    <button onClick={goBack} className="lg:hidden p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Voltar">
                      <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <div className="p-1.5 bg-[#0A2E4A] rounded-lg">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{selectedGroup.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedGroup.member_count} membros · {getCategoryLabel(selectedGroup.category)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant={chatView === 'chat' ? 'default' : 'outline'} onClick={() => setChatView('chat')} className="h-7 px-2 text-xs font-semibold">
                      <MessageCircle className="h-3 w-3 mr-1" />Chat
                    </Button>
                    <Button size="sm" variant={chatView === 'meetings' ? 'default' : 'outline'} onClick={() => setChatView('meetings')} className="h-7 px-2 text-xs font-semibold">
                      <Calendar className="h-3 w-3 mr-1" />Reuniões
                    </Button>
                    <button onClick={() => { setSelectedGroup(null); setMobileView('list') }} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {chatView === 'chat' ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {!isMemberOf(selectedGroup.id) ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                            <p className="text-sm text-muted-foreground">Entre no grupo para ver o chat</p>
                            <Button onClick={() => joinGroup(selectedGroup.id)} size="sm" className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                              <LogIn className="h-3 w-3 mr-1.5" />Entrar no Grupo
                            </Button>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">Sem mensagens ainda. Seja o primeiro!</p>
                        </div>
                      ) : messages.map(msg => {
                        const isOwn = msg.user_id === user?.id
                        return (
                          <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${isOwn ? 'bg-[#0A2E4A]' : 'bg-[#4A90A4]'}`}>
                              {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                              {!isOwn && <span className="text-[10px] font-semibold text-muted-foreground px-1">{msg.user?.username}</span>}
                              <div className={`px-3 py-1.5 rounded-2xl text-sm leading-relaxed ${isOwn ? 'bg-[#0A2E4A] text-white rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                                {msg.message}
                              </div>
                              <span className="text-[10px] text-muted-foreground px-1">
                                {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {isMemberOf(selectedGroup.id) && (
                      <div className="p-2.5 border-t border-border">
                        <div className="flex gap-2">
                          <Input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Mensagem..." className="flex-1 h-9 text-sm" />
                          <Button onClick={sendMessage} disabled={sendingMessage || !newMessage.trim()}
                            className="h-9 px-3 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {meetings.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                          <p className="text-sm text-muted-foreground">Nenhuma reunião agendada</p>
                        </div>
                      </div>
                    ) : meetings.map(meeting => (
                      <Card key={meeting.id} className="p-3 border hover:border-[#4A90A4]/40 transition-colors">
                        <h4 className="font-semibold text-foreground text-sm mb-1">{meeting.title}</h4>
                        {meeting.description && <p className="text-xs text-muted-foreground mb-2">{meeting.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(meeting.meeting_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(meeting.meeting_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          {meeting.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{meeting.location}</span>}
                        </div>
                      </Card>
                    ))}
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
          <DialogHeader><DialogTitle className="text-lg font-bold">Criar Novo Grupo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Nome *</Label>
              <Input value={newGroup.name} onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="Ex: Estudo Bíblico do Bairro Norte" className="h-10 border" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição</Label>
              <Textarea value={newGroup.description} onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} placeholder="Propósito do grupo..." rows={3} className="resize-none border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-semibold mb-1 block">Categoria</Label>
                <select value={newGroup.category} onChange={e => setNewGroup({ ...newGroup, category: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:border-primary">
                  <option value="">Selecione</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="font-semibold mb-1 block">Região</Label>
                <Input value={newGroup.region} onChange={e => setNewGroup({ ...newGroup, region: e.target.value })} placeholder="Ex: Bairro Norte" className="h-10 border" />
              </div>
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Horário de Reunião</Label>
              <Input value={newGroup.meeting_schedule} onChange={e => setNewGroup({ ...newGroup, meeting_schedule: e.target.value })} placeholder="Ex: Sábados às 15h" className="h-10 border" />
            </div>
            <Button onClick={createGroup} className="w-full h-10 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
              <Plus className="mr-2 h-4 w-4" />Criar Grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default GroupsPage
