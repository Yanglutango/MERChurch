import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Checkbox } from '../components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { Heart, Plus, Check, Users, Shield, UserPlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PrayerRequest } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { AdminAction } from '../components/shared/AdminAction'

const PrayerPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [prayedFor, setPrayedFor] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newPrayer, setNewPrayer] = useState({
    title: '',
    description: '',
    isAnonymous: false,
  })

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadPrayers()
    if (!isGuest) {
      loadPrayedFor()
    }
  }, [])

  const loadPrayers = async () => {
    setLoading(true)
    
    // Guest vê apenas pedidos públicos (limitados)
    let query = supabase
      .from('prayer_requests')
      .select(`
        *,
        user:user_profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (isGuest) {
      query = query.limit(5)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading prayers:', error)
      setLoading(false)
      return
    }

    setPrayers(data as any)
    setLoading(false)
  }

  const loadPrayedFor = async () => {
    const { data, error } = await supabase
      .from('prayer_interactions')
      .select('prayer_id')
      .eq('user_id', user!.id)

    if (error) {
      console.error('Error loading prayed for:', error)
      return
    }

    setPrayedFor(data.map((p) => p.prayer_id))
  }

  const createPrayer = async () => {
    if (!newPrayer.title.trim() || !newPrayer.description.trim()) {
      toast.error('Preencha todos os campos')
      return
    }

    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user!.id,
      title: newPrayer.title,
      description: newPrayer.description,
      is_anonymous: newPrayer.isAnonymous,
    })

    if (error) {
      toast.error('Erro ao criar pedido de oração')
      return
    }

    toast.success('Pedido de oração criado!')
    setIsDialogOpen(false)
    setNewPrayer({ title: '', description: '', isAnonymous: false })
    loadPrayers()
  }

  const prayFor = async (prayerId: string) => {
    if (prayedFor.includes(prayerId)) {
      toast.info('Você já orou por este pedido')
      return
    }

    const { error } = await supabase.from('prayer_interactions').insert({
      prayer_id: prayerId,
      user_id: user!.id,
    })

    if (error) {
      toast.error('Erro ao registrar oração')
      return
    }

    // Update prayer count
    const prayer = prayers.find((p) => p.id === prayerId)
    if (prayer) {
      await supabase
        .from('prayer_requests')
        .update({ prayer_count: prayer.prayerCount + 1 })
        .eq('id', prayerId)
    }

    setPrayedFor([...prayedFor, prayerId])
    loadPrayers()
    toast.success('Obrigado por orar! 🙏')
  }

  const deletePrayer = async (prayerId: string) => {
    if (!confirm('Tem certeza que deseja remover este pedido?')) return

    const { error } = await supabase
      .from('prayer_requests')
      .delete()
      .eq('id', prayerId)

    if (error) {
      toast.error('Erro ao remover pedido')
      return
    }

    toast.success('Pedido removido')
    loadPrayers()
  }

  const totalPrayers = prayers.reduce((sum, p) => sum + p.prayerCount, 0)

  if (loading) {
    return (
      <Layout title="Oração">
        <LoadingState fullScreen message="Carregando pedidos de oração..." />
      </Layout>
    )
  }

  return (
    <Layout title="Muro de Oração">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Hero Banner - Contextual por Papel */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=600&fit=crop&q=80"
              alt="Prayer"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-red-700/96 via-rose-700/94 to-pink-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <Heart className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DE ORAÇÃO' : isGuest ? 'MURO DE ORAÇÃO' : 'INTERCESSÃO'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Ore Uns pelos{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Outros
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Veja como a comunidade MER intercede em unidade. Crie uma conta para compartilhar seus pedidos.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Cuidado em{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Oração
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Compartilhe suas necessidades e interceda pelos irmãos. Somos uma família que ora.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Moderar Oração
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Cuide do ambiente de oração com sensibilidade pastoral. Governo silencioso e cuidadoso.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {!isGuest && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-white text-red-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                      >
                        <Plus className="mr-2 h-5 w-5" />
                        Novo Pedido de Oração
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Pedido de Oração</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Título *</Label>
                          <Input
                            id="title"
                            value={newPrayer.title}
                            onChange={(e) => setNewPrayer({ ...newPrayer, title: e.target.value })}
                            placeholder="Motivo da oração..."
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Descrição *</Label>
                          <Textarea
                            id="description"
                            value={newPrayer.description}
                            onChange={(e) => setNewPrayer({ ...newPrayer, description: e.target.value })}
                            placeholder="Compartilhe detalhes do seu pedido..."
                            rows={4}
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="anonymous"
                            checked={newPrayer.isAnonymous}
                            onCheckedChange={(checked) =>
                              setNewPrayer({ ...newPrayer, isAnonymous: checked as boolean })
                            }
                          />
                          <label
                            htmlFor="anonymous"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Pedido anônimo
                          </label>
                        </div>

                        <Button onClick={createPrayer} className="w-full gradient-primary text-white">
                          Criar Pedido
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-white text-red-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Criar Conta para Compartilhar
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
          <div className="grid grid-cols-2 gap-4 md:gap-5">
            <StatCard
              icon={Heart}
              label="Pedidos Ativos"
              value={prayers.length}
              gradient="from-red-500 to-pink-500"
            />
            <StatCard
              icon={Users}
              label="Orações Registradas"
              value={totalPrayers}
              gradient="from-purple-500 to-indigo-500"
            />
          </div>
        )}

        {/* Prayers List */}
        {prayers.length > 0 && (
          <div className="space-y-4">
            {isGuest && (
              <div className="flex items-center justify-between">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-red-600 to-pink-600 rounded-xl shadow-md">
                    <Heart className="h-6 w-6 text-white" />
                  </div>
                  Pedidos Públicos Recentes
                </h2>
              </div>
            )}

            {prayers.map((prayer) => {
              const hasPrayed = prayedFor.includes(prayer.id)
              const isOwnPrayer = prayer.userId === user?.id

              return (
                <Card key={prayer.id} className="p-6 border-2 hover:border-primary/30 transition-all elevation-1">
                  <div className="flex gap-4">
                    {!prayer.isAnonymous && prayer.user?.avatar ? (
                      <img
                        src={prayer.user.avatar}
                        alt={prayer.user.username}
                        className="h-12 w-12 rounded-full flex-shrink-0 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {prayer.isAnonymous ? '?' : prayer.user?.username?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-foreground">{prayer.title}</h3>
                          <div className="text-sm text-muted-foreground">
                            {prayer.isAnonymous ? 'Anônimo' : prayer.user?.username} •{' '}
                            {new Date(prayer.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {prayer.isAnswered && (
                            <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-semibold rounded-full">
                              ✓ Respondida
                            </div>
                          )}
                          {isAdmin && (
                            <AdminAction>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deletePrayer(prayer.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AdminAction>
                          )}
                        </div>
                      </div>

                      <p className="text-foreground mb-4 whitespace-pre-wrap leading-relaxed">{prayer.description}</p>

                      <div className="flex items-center gap-4">
                        {!isGuest ? (
                          <Button
                            onClick={() => prayFor(prayer.id)}
                            disabled={hasPrayed}
                            size="sm"
                            variant={hasPrayed ? 'default' : 'outline'}
                            className={hasPrayed ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' : ''}
                          >
                            {hasPrayed ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Você Orou
                              </>
                            ) : (
                              <>
                                <Heart className="h-4 w-4 mr-1" />
                                Orar
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => navigate('/auth')}
                            size="sm"
                            variant="outline"
                          >
                            <Heart className="h-4 w-4 mr-1" />
                            Criar Conta para Orar
                          </Button>
                        )}

                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {prayer.prayerCount} {prayer.prayerCount === 1 ? 'pessoa orou' : 'pessoas oraram'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && prayers.length > 0 && (
          <GuestPrompt
            title="Compartilhe suas necessidades"
            description="Membros podem criar pedidos de oração e receber intercessão de toda a comunidade MER."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}

        {/* Empty State */}
        {prayers.length === 0 && (
          <EmptyState
            icon={Heart}
            title="Nenhum pedido de oração"
            description={isGuest ? 'Pedidos de oração aparecerão aqui' : 'Seja o primeiro a compartilhar um pedido de oração'}
            action={
              !isGuest ? (
                <Button onClick={() => setIsDialogOpen(true)} className="gradient-primary text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Pedido
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Layout>
  )
}

export default PrayerPage
