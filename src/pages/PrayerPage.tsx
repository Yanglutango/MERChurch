import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { logActivity } from '../lib/activityLogger'
import { Heart, Plus, Check, Users, UserPlus, Trash2, BookOpen, CheckCircle2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import type { PrayerRequest } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const PrayerPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [prayedFor, setPrayedFor] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'mine' | 'answered'>('all')
  const [newPrayer, setNewPrayer] = useState({ title: '', description: '', isAnonymous: false })
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => { loadPrayers(); if (!isGuest) loadPrayedFor() }, [filter])

  const loadPrayers = async () => {
    setLoading(true)
    let query = supabase
      .from('prayer_requests')
      .select('*, user:user_profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
    if (isGuest) query = query.limit(6)
    if (filter === 'mine' && !isGuest) query = query.eq('user_id', user!.id)
    if (filter === 'answered') query = query.eq('is_answered', true)
    const { data, error } = await query
    if (error) { setLoading(false); return }
    setPrayers(data as any)
    setLoading(false)
  }

  const loadPrayedFor = async () => {
    const { data } = await supabase.from('prayer_interactions').select('prayer_id').eq('user_id', user!.id)
    setPrayedFor(data?.map(p => p.prayer_id) || [])
  }

  const createPrayer = async () => {
    if (!newPrayer.title.trim() || !newPrayer.description.trim()) { toast.error('Preencha todos os campos'); return }
    const { data, error } = await supabase.from('prayer_requests').insert({
      user_id: user!.id, title: newPrayer.title, description: newPrayer.description, is_anonymous: newPrayer.isAnonymous,
    }).select().single()
    if (error) { toast.error('Erro ao criar pedido'); return }
    await logActivity({ type: 'prayer_created', actorId: user!.id, actorName: newPrayer.isAnonymous ? 'Anônimo' : user!.username, title: newPrayer.title, referenceId: data?.id, referenceType: 'prayer' })
    toast.success('Pedido de oração compartilhado! 🙏')
    setIsDialogOpen(false)
    setNewPrayer({ title: '', description: '', isAnonymous: false })
    loadPrayers()
  }

  const prayFor = async (prayerId: string) => {
  if (prayedFor.includes(prayerId)) { toast.info('Você já orou por este pedido'); return }
  const { error } = await supabase.from('prayer_interactions').insert({ prayer_id: prayerId, user_id: user!.id })
  if (error) {
    if (error.code === '23505') { toast.info('Você já orou por este pedido'); setPrayedFor(prev => [...prev, prayerId]); return }
    toast.error('Erro ao registrar oração'); return
  }
  // Incremento atómico — sem race condition
  await supabase.rpc('increment_prayer_count', { p_prayer_id: prayerId })
  setPrayedFor(prev => [...prev, prayerId])
  loadPrayers()
  toast.success('Obrigado por orar! 🙏')
}

  const markAnswered = async (prayerId: string) => {
    const { error } = await supabase.from('prayer_requests').update({ is_answered: true }).eq('id', prayerId)
    if (error) { toast.error('Erro'); return }
    toast.success('Testemunho registrado! 🎉')
    loadPrayers()
  }

  const deletePrayer = async () => {
  if (!deleteTargetId) return
  const { data, error } = await supabase.from('prayer_requests').delete().eq('id', deleteTargetId).select('id')
  setDeleteTargetId(null)
  if (error) { toast.error('Erro ao remover'); return }
  if (!data || data.length === 0) {
    toast.error('Sem permissão para remover este pedido')
    return
  }
  toast.success('Pedido removido')
  loadPrayers()
}

  const answeredCount = prayers.filter(p => p.isAnswered).length

  if (loading) return <Layout title="Muro de Oração"><LoadingState fullScreen message="Carregando pedidos de oração..." /></Layout>

  return (
    <Layout title="Muro de Oração">
      <div className="p-4 md:p-6 space-y-5">
        {/* Compact page header */}
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">Muro de Oração</h1>
            <p className="text-sm text-muted-foreground">{prayers.length} pedidos · {answeredCount} respondidos</p>
          </div>
          <div className="flex gap-2">
            {!isGuest && (
              <Button size="sm" onClick={() => setIsDialogOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <Plus className="h-4 w-4 mr-1.5" />Novo Pedido
              </Button>
            )}
            {isGuest && (
              <Button size="sm" onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-semibold">
                <UserPlus className="h-4 w-4 mr-1.5" />Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {!isGuest && (
          <div className="flex gap-1.5 flex-wrap">
            {([
              { id: 'all', label: `Todos (${prayers.length})` },
              { id: 'mine', label: 'Meus Pedidos' },
              { id: 'answered', label: `Respondidos (${answeredCount})` },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f.id ? 'bg-[#0A2E4A] text-white border-[#0A2E4A]' : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Feed */}
        {prayers.length === 0 ? (
          <EmptyState icon={Heart} title="Nenhum pedido de oração" description={isGuest ? 'Pedidos aparecerão aqui' : 'Seja o primeiro a compartilhar'} action={!isGuest ? (
            <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white"><Plus className="mr-2 h-4 w-4" />Criar Pedido</Button>
          ) : undefined} />
        ) : (
          <div className="space-y-3">
            {prayers.map(prayer => {
              const hasPrayed = prayedFor.includes(prayer.id)
              const isOwn = prayer.userId === user?.id

              return (
                <Card key={prayer.id} className={`p-4 border transition-all hover:shadow-md ${prayer.isAnswered ? 'border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10' : 'hover:border-rose-200 dark:hover:border-rose-900/50'}`}>
                  <div className="flex gap-3">
                    {/* Avatar: anonymous gets Lock icon */}
                    {prayer.isAnonymous ? (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : prayer.user?.avatar_url ? (
                      <img src={prayer.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover flex-shrink-0 border-2 border-rose-200 dark:border-rose-900" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0A2E4A] to-[#4A90A4] flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                        {prayer.user?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-1.5">
                        <div>
                          <h3 className="font-bold text-foreground text-sm leading-tight">{prayer.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {prayer.isAnonymous ? 'Anônimo' : prayer.user?.username} · {new Date(prayer.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {prayer.isAnswered && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-bold rounded-full border border-green-200 dark:border-green-800">
                              <CheckCircle2 className="h-2.5 w-2.5" />Respondida
                            </span>
                          )}
                          {(isAdmin || isOwn) && (
                            <button onClick={() => setDeleteTargetId(prayer.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/20 hover:text-red-600 text-muted-foreground transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{prayer.description}</p>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                        {!isGuest ? (
                          <>
                            <Button onClick={() => prayFor(prayer.id)} disabled={hasPrayed} size="sm" variant={hasPrayed ? 'default' : 'outline'}
                              className={`h-8 text-xs font-semibold ${hasPrayed ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-0' : 'hover:border-rose-300 hover:text-rose-600'}`}>
                              {hasPrayed ? <><Check className="h-3 w-3 mr-1" />Orei!</> : <><Heart className="h-3 w-3 mr-1" />Orar</>}
                            </Button>
                            {isOwn && !prayer.isAnswered && (
                              <Button size="sm" variant="outline" onClick={() => markAnswered(prayer.id)} className="h-8 text-xs font-semibold hover:border-green-300 hover:text-green-600">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Respondida
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => navigate('/auth')} className="h-8 text-xs font-semibold">
                            <Heart className="h-3 w-3 mr-1" />Criar Conta para Orar
                          </Button>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                          <Heart className="h-3 w-3 text-rose-400" />
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
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />Novo Pedido de Oração
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold mb-1 block">Título *</Label>
              <Input value={newPrayer.title} onChange={e => setNewPrayer({ ...newPrayer, title: e.target.value })} placeholder="Motivo da oração..." className="h-10 border" />
            </div>
            <div>
              <Label className="font-semibold mb-1 block">Descrição *</Label>
              <Textarea value={newPrayer.description} onChange={e => setNewPrayer({ ...newPrayer, description: e.target.value })}
                placeholder="Compartilhe detalhes do seu pedido..." rows={5} className="resize-none border" maxLength={1000} />
              <p className="text-xs text-muted-foreground mt-1">{newPrayer.description.length}/1000</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Checkbox id="anon" checked={newPrayer.isAnonymous} onCheckedChange={c => setNewPrayer({ ...newPrayer, isAnonymous: c as boolean })} />
              <label htmlFor="anon" className="text-sm font-medium cursor-pointer">
                Publicar de forma anônima
                <span className="block text-xs text-muted-foreground mt-0.5">Seu nome não aparecerá no pedido</span>
              </label>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed italic">"Orai uns pelos outros, para que sareis." — Tiago 5:16</p>
              </div>
            </div>
            <Button onClick={createPrayer} className="w-full h-10 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold">
              <Heart className="mr-2 h-4 w-4" />Compartilhar Pedido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remover pedido de oração?</AlertDialogTitle>
      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={deletePrayer} className="bg-red-600 hover:bg-red-700 text-white">
        Remover
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
    </Layout>
  )
}

export default PrayerPage
