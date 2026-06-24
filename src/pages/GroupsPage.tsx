import { useState, useEffect, useRef } from 'react'
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
import { useRealTime } from '../hooks/useRealTime'
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
  const { version } = useRealTime()
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

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const isGuest = user?.role === 'guest'

  useEffect(() => { loadGroups(); if (!isGuest) loadMyGroups() }, [])

  useEffect(() => {
    if (selectedGroup) {
      setMessages([])
      loadMessages(selectedGroup.id)
      loadMeetings(selectedGroup.id)
    }
  }, [selectedGroup?.id, version])

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
      <div className="max-w-7xl mx-auto p-4 space-y-5 font-sans antialiased">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0A2E4A] dark:text-zinc-100">Grupos & Células</h1>
            <p className="text-xs text-muted-foreground">Conecte-se em comunidade por região e interesse</p>
          </div>
          <div className="flex gap-2">
            {!isGuest && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="h-9 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium rounded-xl px-4 shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" /> Criar Grupo
              </Button>
            )}
            {isGuest && (
              <Button onClick={() => navigate('/auth')} size="sm" className="h-9 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium rounded-xl px-4 shadow-sm">
                <UserPlus className="h-4 w-4 mr-1.5" /> Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Core Main Grid */}
        <div className="grid lg:grid-cols-3 gap-5 items-start">
          
          {/* Left Column (Lists & Filters) */}
          <div className={`lg:col-span-1 space-y-4 ${mobileView === 'chat' ? 'hidden lg:block' : 'block'}`}>
            <Card className="p-3.5 border border-border/50 shadow-sm bg-card rounded-2xl">
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <Input 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar grupo ou região..." 
                    className="pl-9 h-9 bg-background/50 rounded-xl border-border/60 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-muted-foreground/20" 
                  />
                </div>
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:border-primary/40 text-foreground"
                >
                  <option value="all">Todas as Categorias</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </Card>

            <div className="space-y-2.5">
              {filteredGroups.length === 0
                ? <EmptyState icon={Users} title="Nenhum grupo encontrado" description="Aguarde novos grupos ou crie o primeiro" />
                : filteredGroups.map(group => {
                    const isMember = isMemberOf(group.id)
                    const isSelected = selectedGroup?.id === group.id
                    return (
                      <Card 
                        key={group.id}
                        className={`p-4 border transition-all rounded-2xl cursor-pointer ${
                          isSelected 
                            ? 'border-[#0A2E4A] bg-[#0A2E4A]/5 shadow-sm dark:border-zinc-400 dark:bg-zinc-800/10' 
                            : 'border-border/40 bg-card hover:border-border/80 hover:shadow-sm'
                        }`}
                        onClick={() => selectGroup(group)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-semibold text-foreground text-sm leading-snug">{group.name}</h3>
                              {isMember && <span className="px-2 py-0.5 bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full tracking-wide">Membro</span>}
                            </div>
                            
                            {group.category && (
                              <span className="inline-block px-2 py-0.5 bg-[#0A2E4A]/5 dark:bg-zinc-800 text-[#0A2E4A] dark:text-zinc-300 text-[10px] font-medium rounded-full border border-border/30">
                                {getCategoryLabel(group.category)}
                              </span>
                            )}
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground/80 pt-0.5">
                              {group.region && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 opacity-70" />{group.region}</span>}
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 opacity-70" />{group.member_count}</span>
                            </div>
                          </div>
                          
                          {!isGuest && (
                            <Button 
                              size="sm" 
                              variant={isMember ? 'outline' : 'default'}
                              onClick={e => { e.stopPropagation(); isMember ? leaveGroup(group.id) : joinGroup(group.id) }}
                              className={`flex-shrink-0 h-8 px-3 text-xs font-semibold rounded-xl transition-colors ${
                                isMember 
                                  ? 'border-destructive/30 text-destructive hover:bg-destructive/5 dark:border-destructive/40' 
                                  : 'bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white'
                              }`}
                            >
                              {isMember ? <><LogOut className="h-3.5 w-3.5 mr-1" />Sair</> : <><LogIn className="h-3.5 w-3.5 mr-1" />Entrar</>}
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

          {/* Right Column (Dynamic Workspace Box) */}
          <div className={`lg:col-span-2 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            {!selectedGroup ? (
              <Card className="h-full min-h-[440px] flex items-center justify-center border border-dashed border-border/80 rounded-2xl bg-card/30">
                <div className="text-center space-y-3.5 p-8">
                  <div className="inline-flex p-4.5 bg-muted rounded-2xl border border-border/40 shadow-inner">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="font-semibold text-foreground text-sm">Selecione um grupo</h3>
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                    {isGuest ? 'Crie uma conta para participar dos grupos.' : 'Escolha um grupo ao lado para ver o canal de conversas e reuniões agendadas.'}
                  </p>
                </div>
              </Card>
            ) : (
              <Card className="flex flex-col border border-border/40 shadow-sm bg-card rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: '520px' }}>
                
                {/* Header Sub-Bar Inside Workspace */}
                <div className="p-3.5 border-b border-border/40 flex items-center justify-between gap-3 bg-muted/20 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <button onClick={goBack} className="lg:hidden p-1.5 hover:bg-muted rounded-xl transition-colors text-muted-foreground" aria-label="Voltar">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="p-2 bg-[#0A2E4A]/10 dark:bg-zinc-800 text-[#0A2E4A] dark:text-zinc-200 rounded-xl border border-border/30">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-sm truncate leading-tight">{selectedGroup.name}</h3>
                      <p className="text-[10px] text-muted-foreground/90 truncate mt-0.5">{selectedGroup.member_count} membros · {getCategoryLabel(selectedGroup.category)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant={chatView === 'chat' ? 'default' : 'outline'} 
                      onClick={() => setChatView('chat')} 
                      className={`h-7.5 rounded-lg px-2.5 text-xs font-semibold ${chatView === 'chat' ? 'bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted-foreground border-border/60'}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />Chat
                    </Button>
                    <Button 
                      size="sm" 
                      variant={chatView === 'meetings' ? 'default' : 'outline'} 
                      onClick={() => setChatView('meetings')} 
                      className={`h-7.5 rounded-lg px-2.5 text-xs font-semibold ${chatView === 'meetings' ? 'bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-muted-foreground border-border/60'}`}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1" />Reuniões
                    </Button>
                    <button onClick={() => { setSelectedGroup(null); setMobileView('list') }} className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground/70 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Switchable Chat Feed View */}
                {chatView === 'chat' ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-background/20">
                      {!isMemberOf(selectedGroup.id) ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center space-y-3 p-4">
                            <MessageCircle className="h-9 w-9 text-muted-foreground/30 mx-auto" />
                            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">Entre no grupo para participar e acompanhar as mensagens dos membros.</p>
                            <Button onClick={() => joinGroup(selectedGroup.id)} size="sm" className="h-8.5 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 text-white font-semibold rounded-xl px-4">
                              <LogIn className="h-3.5 w-3.5 mr-1.5" />Entrar no Grupo
                            </Button>
                          </div>
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-xs text-muted-foreground/80 font-medium">Sem mensagens ainda neste canal. Seja o primeiro!</p>
                        </div>
                      ) : messages.map(msg => {
                          const isOwn = msg.user_id === user?.id
                          const hasAvatar = !!msg.user?.avatar_url
                          return (
                            <div key={msg.id} className={`flex gap-2.5 items-end ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {hasAvatar ? (
                                <img src={msg.user!.avatar_url!} alt={msg.user!.username} className="h-7 w-7 rounded-full flex-shrink-0 object-cover border border-border/40 shadow-sm" />
                              ) : (
                                <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold shadow-sm ${isOwn ? 'bg-[#0A2E4A]' : 'bg-[#4A90A4]'}`}>
                                  {msg.user?.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                              )}
                              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                                {!isOwn && <span className="text-[10px] font-semibold text-muted-foreground/90 px-1.5 mb-0.5">{msg.user?.username}</span>}
                                <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                                  isOwn 
                                    ? 'bg-[#0A2E4A] dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-none shadow-sm' 
                                    : 'bg-muted/80 dark:bg-muted text-foreground rounded-bl-none border border-border/10'
                                }`}>
                                  {msg.message}
                                </div>
                                <span className="text-[9px] text-muted-foreground/60 px-1.5 mt-0.5">
                                  {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          )
                        })
                      }
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Text Input Section */}
                    {isMemberOf(selectedGroup.id) && (
                      <div className="p-3 border-t border-border/40 bg-card/50">
                        <div className="flex gap-2">
                          <Input 
                            value={newMessage} 
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                            placeholder="Escreva uma mensagem..." 
                            className="flex-1 h-9 rounded-xl bg-background border-border/60 text-sm focus-visible:ring-muted-foreground/20 placeholder:text-muted-foreground/60" 
                          />
                          <Button 
                            onClick={sendMessage} 
                            disabled={sendingMessage || !newMessage.trim()}
                            className="h-9 w-9 p-0 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 text-white rounded-xl flex items-shrink-0 items-center justify-center shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Meetings Sub-Feed View */
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/20">
                    {meetings.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center space-y-2 p-4">
                          <Calendar className="h-9 w-9 text-muted-foreground/30 mx-auto" />
                          <p className="text-xs text-muted-foreground">Nenhuma reunião ou evento agendado.</p>
                        </div>
                      </div>
                    ) : meetings.map(meeting => (
                        <Card key={meeting.id} className="p-4 border border-border/40 bg-card rounded-2xl hover:border-border/80 transition-colors shadow-sm">
                          <h4 className="font-bold text-foreground text-sm leading-tight mb-1">{meeting.title}</h4>
                          {meeting.description && <p className="text-xs text-muted-foreground/90 mb-3 leading-relaxed">{meeting.description}</p>}
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground/80 pt-1">
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 opacity-70" />{new Date(meeting.meeting_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 opacity-70" />{new Date(meeting.meeting_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            {meeting.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 opacity-70" />{meeting.location}</span>}
                          </div>
                        </Card>
                      ))
                    }
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Dialog Creator Form */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-2xl border-border/60 shadow-lg p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Nome do Grupo *</Label>
              <Input 
                value={newGroup.name} 
                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} 
                placeholder="Ex: Célula Morada da Paz" 
                className="h-9.5 rounded-xl border-border/60 text-sm focus-visible:ring-muted-foreground/20" 
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Descrição / Propósito</Label>
              <Textarea 
                value={newGroup.description} 
                onChange={e => setNewGroup({ ...newGroup, description: e.target.value })} 
                placeholder="Qual o objetivo principal do grupo?" 
                rows={3} 
                className="resize-none rounded-xl border-border/60 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-muted-foreground/20" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Categoria</Label>
                <select 
                  value={newGroup.category} 
                  onChange={e => setNewGroup({ ...newGroup, category: e.target.value })}
                  className="w-full h-9.5 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:border-primary/40 text-foreground"
                >
                  <option value="">Selecione</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Região / Cidade</Label>
                <Input 
                  value={newGroup.region} 
                  onChange={e => setNewGroup({ ...newGroup, region: e.target.value })} 
                  placeholder="Ex: Zona Central" 
                  className="h-9.5 rounded-xl border-border/60 text-sm focus-visible:ring-muted-foreground/20" 
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground block mb-1.5">Horário de Reunião</Label>
              <Input 
                value={newGroup.meeting_schedule} 
                onChange={e => setNewGroup({ ...newGroup, meeting_schedule: e.target.value })} 
                placeholder="Ex: Sábados às 18h00" 
                className="h-9.5 rounded-xl border-border/60 text-sm focus-visible:ring-muted-foreground/20" 
              />
            </div>
            <Button 
              onClick={createGroup} 
              className="w-full h-10 bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-white font-medium rounded-xl text-xs mt-2 shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />Criar Grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default GroupsPage
