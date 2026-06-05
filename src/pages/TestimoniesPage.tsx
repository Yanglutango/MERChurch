import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Heart, Plus, Trash2, Star, Sparkles, UserPlus, Shield, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Testimony } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const CATEGORIES: Record<string, string> = {
  salvacao: 'Salvação', cura: 'Cura', libertacao: 'Libertação',
  provisao: 'Provisão', restauracao: 'Restauração', outro: 'Outro',
}

type TabType = 'all' | 'mine' | 'pending'

const TestimoniesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [testimonies, setTestimonies] = useState<Testimony[]>([])
  const [myTestimonies, setMyTestimonies] = useState<Testimony[]>([])
  const [pendingTestimonies, setPendingTestimonies] = useState<Testimony[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTestimony, setNewTestimony] = useState({ title: '', content: '', category: '', isAnonymous: false })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [approvedRes, myRes, pendingRes] = await Promise.all([
      supabase.from('testimonies').select('*, user:user_profiles(username, avatar_url)').eq('is_approved', true).order('created_at', { ascending: false }),
      user && !isGuest
        ? supabase.from('testimonies').select('*, user:user_profiles(username, avatar_url)').eq('user_id', user.id).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      isAdmin
        ? supabase.from('testimonies').select('*, user:user_profiles(username, avatar_url)').eq('is_approved', false).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ])
    setTestimonies(approvedRes.data as any || [])
    setMyTestimonies(myRes.data as any || [])
    setPendingTestimonies(pendingRes.data as any || [])
    setLoading(false)
  }

  const createTestimony = async () => {
    if (!newTestimony.title.trim() || !newTestimony.content.trim()) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    const { error } = await supabase.from('testimonies').insert({
      user_id: user!.id, title: newTestimony.title, content: newTestimony.content,
      category: newTestimony.category, is_anonymous: newTestimony.isAnonymous,
    })
    if (error) { toast.error('Erro ao criar testemunho'); return }
    toast.success('Testemunho enviado para aprovação! 🙏')
    setIsDialogOpen(false)
    setNewTestimony({ title: '', content: '', category: '', isAnonymous: false })
    loadAll()
  }

  const approveTestimony = async (testimonyId: string, authorId: string) => {
    const { error } = await supabase.from('testimonies')
      .update({ is_approved: true, approved_by: user!.id })
      .eq('id', testimonyId)
    if (error) { toast.error('Erro ao aprovar'); return }

    // Notify the author
    await supabase.from('notifications').insert({
      user_id: authorId,
      title: 'Testemunho aprovado! 🎉',
      message: 'Seu testemunho foi publicado e está disponível para a comunidade.',
      type: 'testimony',
    })

    toast.success('Testemunho aprovado!')
    loadAll()
  }

  const deleteTestimony = async (testimonyId: string) => {
    if (!confirm('Remover este testemunho?')) return
    const { error } = await supabase.from('testimonies').delete().eq('id', testimonyId)
    if (error) { toast.error('Erro ao remover'); return }
    toast.success('Testemunho removido')
    loadAll()
  }

  const getStatusBadge = (t: any) => {
    if (t.is_approved) return { label: 'Publicado', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' }
    return { label: 'Pendente de aprovação', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' }
  }

  const displayList: Testimony[] =
    activeTab === 'mine'    ? myTestimonies :
    activeTab === 'pending' ? pendingTestimonies :
    testimonies

  if (loading) return <Layout title="Testemunhos"><LoadingState fullScreen message="Carregando testemunhos..." /></Layout>

  return (
    <Layout title="Testemunhos">
      <div className="space-y-5">
        {/* Compact header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Testemunhos</h1>
            <p className="text-sm text-muted-foreground">{testimonies.length} histórias publicadas</p>
          </div>
          <div className="flex gap-2">
            {!isGuest && (
              <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />Compartilhar
              </Button>
            )}
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-1.5" />Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!isGuest && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeTab === 'all' ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
              Todos ({testimonies.length})
            </button>
            <button onClick={() => setActiveTab('mine')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${activeTab === 'mine' ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
              Meus Testemunhos ({myTestimonies.length})
            </button>
            {isAdmin && (
              <button onClick={() => setActiveTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors relative ${activeTab === 'pending' ? 'bg-amber-600 text-white border-amber-600' : 'border-amber-300 text-amber-700 dark:text-amber-300 hover:border-amber-500'}`}>
                <Shield className="h-3 w-3 inline mr-1" />
                Pendentes ({pendingTestimonies.length})
                {pendingTestimonies.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingTestimonies.length}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Admin confidentiality warning */}
        {isAdmin && activeTab === 'pending' && pendingTestimonies.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Estes testemunhos contêm informações sensíveis.</strong> Leia o conteúdo completo antes de aprovar. Mantenha total confidencialidade pastoral.
              </p>
            </div>
          </div>
        )}

        {/* Testimony list */}
        {displayList.length === 0 ? (
          <EmptyState icon={Sparkles}
            title={activeTab === 'mine' ? 'Você ainda não compartilhou testemunhos' : activeTab === 'pending' ? 'Nenhum testemunho pendente' : 'Nenhum testemunho publicado'}
            description={activeTab === 'mine' ? 'Compartilhe como Deus agiu em sua vida' : activeTab === 'pending' ? 'Todos os testemunhos foram revisados' : 'Testemunhos aparecerão aqui quando aprovados'}
            action={!isGuest && activeTab !== 'pending' ? (
              <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">
                <Plus className="mr-2 h-4 w-4" />Compartilhar Testemunho
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="space-y-4">
            {displayList.map(testimony => {
              const status = getStatusBadge(testimony as any)
              const isOwn = testimony.userId === user?.id

              return (
                <Card key={testimony.id} className="p-5 border hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    {!(testimony as any).isAnonymous && (testimony as any).user?.avatar_url ? (
                      <img src={(testimony as any).user.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0 border-2 border-primary/20" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#D4A574] to-[#c89860] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
                        {(testimony as any).isAnonymous ? '?' : (testimony as any).user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-foreground text-base leading-tight">{testimony.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{(testimony as any).isAnonymous ? 'Anônimo' : (testimony as any).user?.username}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(testimony.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </span>
                            {testimony.category && (
                              <>
                                <span>·</span>
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full capitalize">
                                  {CATEGORIES[testimony.category] || testimony.category}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Status badge for own testimonies */}
                          {(isOwn || isAdmin) && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${status.cls}`}>
                              {status.label}
                            </span>
                          )}
                          {/* Approved badge for everyone */}
                          {(testimony as any).is_approved && !isOwn && !isAdmin && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                              <Star className="h-2.5 w-2.5" />Aprovado
                            </span>
                          )}
                          {/* Admin actions */}
                          {isAdmin && (
                            <div className="flex gap-1">
                              {!(testimony as any).is_approved && (
                                <Button size="sm" onClick={() => approveTestimony(testimony.id, testimony.userId)}
                                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold">
                                  Aprovar
                                </Button>
                              )}
                              <Button size="sm" variant="destructive" onClick={() => deleteTestimony(testimony.id)} className="h-7 w-7 p-0">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                        {(testimony as any).is_approved || isAdmin || isOwn ? testimony.content : testimony.content.slice(0, 100) + '…'}
                      </p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {isGuest && testimonies.length > 0 && (
          <GuestPrompt title="Compartilhe sua transformação" description="Membros podem compartilhar testemunhos e inspirar outros na jornada da fé." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Compartilhar Testemunho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Título *</Label>
              <Input value={newTestimony.title} onChange={e => setNewTestimony({ ...newTestimony, title: e.target.value })}
                placeholder="Ex: Como Deus me libertou da depressão" className="h-10 border" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Categoria</Label>
              <Select value={newTestimony.category} onValueChange={v => setNewTestimony({ ...newTestimony, category: v })}>
                <SelectTrigger className="h-10 border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Sua história *</Label>
              <Textarea value={newTestimony.content} onChange={e => setNewTestimony({ ...newTestimony, content: e.target.value })}
                placeholder="Compartilhe como Deus agiu em sua vida..." rows={7} className="resize-none border" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="anon" checked={newTestimony.isAnonymous} onCheckedChange={c => setNewTestimony({ ...newTestimony, isAnonymous: c as boolean })} />
              <label htmlFor="anon" className="text-sm font-medium cursor-pointer">Publicar de forma anônima</label>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                ℹ️ Seu testemunho será revisado pela equipe pastoral antes de ser publicado.
              </p>
            </div>
            <Button onClick={createTestimony} className="w-full h-10 bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
              Enviar Testemunho
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default TestimoniesPage
