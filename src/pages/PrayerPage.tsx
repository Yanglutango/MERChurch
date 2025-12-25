import { useState, useEffect } from 'react'
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
import { Heart, Plus, Check, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { PrayerRequest } from '../types'

const PrayerPage = () => {
  const { user } = useAuth()
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [prayedFor, setPrayedFor] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPrayer, setNewPrayer] = useState({
    title: '',
    description: '',
    isAnonymous: false,
  })

  useEffect(() => {
    loadPrayers()
    loadPrayedFor()
  }, [])

  const loadPrayers = async () => {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select(`
        *,
        user:user_profiles(username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading prayers:', error)
      return
    }

    setPrayers(data as any)
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

  return (
    <Layout title="Oração">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-8 border-2 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <Heart className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Muro de Oração</h1>
              <p className="text-white/90 text-lg">Ore uns pelos outros e sejam curados</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                <Plus className="h-5 w-5 mr-2" />
                Novo Pedido de Oração
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Pedido de Oração</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={newPrayer.title}
                    onChange={(e) => setNewPrayer({ ...newPrayer, title: e.target.value })}
                    placeholder="Motivo da oração..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
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

                <Button onClick={createPrayer} className="w-full">
                  Criar Pedido
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 border-2 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{prayers.length}</div>
            <div className="text-sm text-muted-foreground">Pedidos Ativos</div>
          </Card>
          <Card className="p-6 border-2 text-center">
            <div className="text-3xl font-bold text-primary mb-1">
              {prayers.reduce((sum, p) => sum + p.prayerCount, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Orações Registradas</div>
          </Card>
        </div>

        {/* Prayers List */}
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const hasPrayed = prayedFor.includes(prayer.id)

            return (
              <Card key={prayer.id} className="p-6 border-2 hover:border-primary/30 transition-all">
                <div className="flex gap-4">
                  {!prayer.isAnonymous && prayer.user?.avatar ? (
                    <img
                      src={prayer.user.avatar}
                      alt={prayer.user.username}
                      className="h-12 w-12 rounded-full flex-shrink-0"
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

                      {prayer.isAnswered && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          ✓ Respondida
                        </div>
                      )}
                    </div>

                    <p className="text-foreground mb-4 whitespace-pre-wrap">{prayer.description}</p>

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => prayFor(prayer.id)}
                        disabled={hasPrayed}
                        size="sm"
                        variant={hasPrayed ? 'default' : 'outline'}
                        className={hasPrayed ? 'bg-gradient-to-r from-red-500 to-pink-500' : ''}
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

        {prayers.length === 0 && (
          <Card className="p-12 text-center border-2">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pedido de oração no momento</p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default PrayerPage
