import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Heart, Plus, Check, Users, Shield, UserPlus, Trash2, BookOpen, Filter, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PrayerRequest } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const PrayerPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [prayedFor, setPrayedFor] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mine' | 'answered'>('all')
  const [newPrayer, setNewPrayer] = useState({ title: '', description: '', isAnonymous: false })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadPrayers()
    if (!isGuest) loadPrayedFor()
  }, [filter])

  const loadPrayers = async () => {
    setLoading(true)
    let query = supabase.from('prayer_requests').select('*, user:user_profiles(username, avatar_url)').order('created_at', { ascending: false })
    if (isGuest) query = query.limit(6)
    if (filter === 'mine' && !isGuest) query = query.eq('user_id', user!.id)
    if (filter === 'answered') query = query.eq('is_answered', true)
    const { data, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setPrayers(data as any)
    setLoading(false)
  }

  const loadPrayedFor = async () => {
    const { data } = await supabase.from('prayer_interactions').select('prayer_id').eq('user_id', user!.id)
    setPrayedFor(data?.map(p => p.prayer_id) || [])
  }

  const createPrayer = async () => {
    if (!newPrayer.title.trim() || !newPrayer.description.trim()) { toast.error('Preencha todos os campos'); return }
    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user!.id, title: newPrayer.title, description: newPrayer.description, is_anonymous: newPrayer.isAnonymous,
    })
    if (error) { toast.error('Erro ao criar pedido'); return }
    toast.success('Pedido de oração compartilhado! 🙏')
    setIsDialogOpen(false)
    setNewPrayer({ title: '', description: '', isAnonymous: false })
    loadPrayers()
  }

  const prayFor = async (prayerId: string) => {
    if (prayedFor.includes(prayerId)) { toast.info('Você já orou por este pedido'); return }
    const { error } = await supabase.from('prayer_interactions').insert({ prayer_id: prayerId, user_id: user!.id })
    if (error) { toast.error('Erro ao registrar oração'); return }
    const prayer = prayers.find(p => p.id === prayerId)
    if (prayer) await supabase.from('prayer_requests').update({ prayer_count: prayer.prayerCount + 1 }).eq('id', prayerId)
    setPrayedFor([...prayedFor, prayerId])
    loadPrayers()
    toast.success('Obrigado por orar! 🙏')
  }

  const markAnswered = async (prayerId: string) => {
    const { error } = await supabase.from('prayer_requests').update({ is_answered: true }).eq('id', prayerId)
    if (error) { toast.error('Erro'); return }
    toast.success('Testemunho de resposta registrado! 🎉')
    loadPrayers()
  }

  const deletePrayer = async (prayerId: string) => {
    if (!confirm('Remover este pedido?')) return
    const { error } = await supabase.from('prayer_requests').delete().eq('id', prayerId)
    if (error) { toast.error('Erro ao remover'); return }
    toast.success('Pedido removido')
    loadPrayers()
  }

  const totalPrayers = prayers.reduce((sum, p) => sum + p.prayerCount, 0)
  const answeredCount = prayers.filter(p => p.isAnswered).length

  if (loading) return <Layout title="Oração"><LoadingState fullScreen message="Carregando pedidos de oração..." /></Layout>

  return (
    <Layout title="Muro de Oração">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl">
          <div className="absolute inset-0">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=600&fit=crop&q=80" alt="Prayer" className="w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-br from-red-700/96 via-rose-700/94 to-pink-700/92" />
          </div>
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Heart className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">MURO DE INTERCESSÃO</span>
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                Ore Uns pelos{' '}
                <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">Outros</span>
              </h1>
              <p className="text-base md:text-xl text-white/90 font-medium leading-relaxed max-w-2xl">
                {isGuest ? 'Veja como a comunidade MER intercede em unidade. Crie uma conta para compartilhar seus pedidos.' : isAdmin ? 'Cuide do ambiente de oração com sensibilidade pastoral.' : 'Compartilhe suas necessidades e interceda pelos irmãos. Somos uma família que ora.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {!isGuest && (
                  <Button onClick={() => setIsDialogOpen(true)} size="lg" className="bg-white text-red-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all">
                    <Plus className="mr-2 h-5 w-5" />Novo Pedido de Oração
                  </Button>
                )}
                {isGuest && (
                  <Button size="lg" onClick={() => navigate('/auth')} className="bg-white text-red-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl">
                    <UserPlus className="mr-2 h-5 w-5" />Criar Conta para Compartilhar
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats */}
        {!isGuest && (
          <div className="grid grid-cols-3 gap-3 md:gap-5">
            <StatCard icon={Heart} label="Pedidos Ativos" value={prayers.length} gradient="from-red-500 to-pink-500" />
            <StatCard icon={Users} label="Orações Registradas" value={totalPrayers} gradient="from-purple-500 to-indigo-500" />
            <StatCard icon={CheckCircle2} label="Respondidas" value={answeredCount} gradient="from-green-500 to-emerald-500" />
          </div>
        )}

        {/* Filters */}
        {!isGuest && (
          <Card className="p-4 border-2">
            <div className="flex flex-wrap gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className="font-semibold border-2">
                <Filter className="h-3.5 w-3.5 mr-1.5" />Todos ({prayers.length})
              </Button>
              <Button variant={filter === 'mine' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('mine')} className="font-semibold border-2">
                <Heart className="h-3.5 w-3.5 mr-1.5" />Meus Pedidos
              </Button>
              <Button variant={filter === 'answered' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('answered')} className="font-semibold border-2">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Respondidos ({answeredCount})
              </Button>
            </div>
          </Card>
        )}

        {/* Prayers Feed */}
        {prayers.length === 0 ? (
          <EmptyState icon={Heart} title="Nenhum pedido de oração" description={isGuest ? 'Pedidos aparecerão aqui' : 'Seja o primeiro a compartilhar um pedido'} action={!isGuest ? <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white"><Plus className="mr-2 h-4 w-4" />Criar Pedido</Button> : undefined} />
        ) : (
          <div className="space-y-4">
            {prayers.map(prayer => {
              const hasPrayed = prayedFor.includes(prayer.id)
              const isOwn = prayer.userId === user?.id

              return (
                <Card key={prayer.id} className={`p-5 md:p-6 border-2 transition-all hover:shadow-lg ${prayer.isAnswered ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/10' : 'hover:border-rose-200 dark:hover:border-rose-800'}`}>
                  <div className="flex gap-3 md:gap-4">
                    {!prayer.isAnonymous && prayer.user?.avatar ? (
                      <img src={prayer.user.avatar} alt={prayer.user.username} className="h-11 w-11 md:h-12 md:w-12 rounded-full flex-shrink-0 object-cover border-2 border-rose-200 dark:border-rose-800" />
                    ) : (
                      <div className="h-11 w-11 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md text-sm md:text-base">
                        {prayer.isAnonymous ? '🙏' : prayer.user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-foreground text-base md:text-lg leading-tight">{prayer.title}</h3>
                          <div className="text-xs md:text-sm text-muted-foreground">
                            {prayer.isAnonymous ? 'Anônimo' : prayer.user?.username} • {new Date(prayer.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {prayer.isAnswered && (
                            <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full border border-green-200 dark:border-green-800">
                              <CheckCircle2 className="h-3 w-3" />Respondida
                            </div>
                          )}
                          {(isAdmin || isOwn) && (
                            <Button size="sm" variant="ghost" onClick={() => deletePrayer(prayer.id)} className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-950/20 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm md:text-base text-foreground/90 mb-4 leading-relaxed whitespace-pre-wrap">{prayer.description}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
                        {!isGuest ? (
                          <>
                            <Button onClick={() => prayFor(prayer.id)} disabled={hasPrayed} size="sm" variant={hasPrayed ? 'default' : 'outline'}
                              className={`font-semibold h-9 ${hasPrayed ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white border-0' : 'hover:border-rose-300 hover:text-rose-600'}`}>
                              {hasPrayed ? <><Check className="h-3.5 w-3.5 mr-1.5" />Orei!</> : <><Heart className="h-3.5 w-3.5 mr-1.5" />Orar</>}
                            </Button>
                            {isOwn && !prayer.isAnswered && (
                              <Button size="sm" variant="outline" onClick={() => markAnswered(prayer.id)} className="font-semibold h-9 hover:border-green-300 hover:text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />Marcar Respondida
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate('/auth')} className="font-semibold h-9">
                            <Heart className="h-3.5 w-3.5 mr-1.5" />Criar Conta para Orar
                          </Button>
                        )}
                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-muted-foreground ml-auto">
                          <Heart className="h-3.5 w-3.5 text-rose-400" />
                          <span className="font-semibold">{prayer.prayerCount}</span>
                          <span>{prayer.prayerCount === 1 ? 'pessoa orou' : 'pessoas oraram'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {isGuest && prayers.length > 0 && (
          <GuestPrompt title="Compartilhe suas necessidades" description="Membros podem criar pedidos de oração e receber intercessão de toda a comunidade MER." actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}
      </div>

      {/* New Prayer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />Novo Pedido de Oração
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Título *</Label>
              <Input value={newPrayer.title} onChange={e => setNewPrayer({ ...newPrayer, title: e.target.value })} placeholder="Motivo da oração..." className="h-11 border-2" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição *</Label>
              <Textarea value={newPrayer.description} onChange={e => setNewPrayer({ ...newPrayer, description: e.target.value })} placeholder="Compartilhe detalhes do seu pedido com confiança..." rows={5} className="resize-none border-2" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="anon" checked={newPrayer.isAnonymous} onCheckedChange={c => setNewPrayer({ ...newPrayer, isAnonymous: c as boolean })} />
              <label htmlFor="anon" className="text-sm font-medium text-foreground cursor-pointer">Publicar de forma anônima</label>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">"Orai uns pelos outros, para que sareis." — Tiago 5:16</p>
              </div>
            </div>
            <Button onClick={createPrayer} className="w-full h-11 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold">
              <Heart className="mr-2 h-4 w-4" />Compartilhar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default PrayerPage
