import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Users, Plus, UserPlus, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import type { Ministry } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'

const MinistriesPage = () => {
  const { user } = useAuth()
  const [ministries, setMinistries] = useState<Ministry[]>([])
  const [joinedMinistries, setJoinedMinistries] = useState<string[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newMinistry, setNewMinistry] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
  })

  useEffect(() => {
    loadMinistries()
    loadJoinedMinistries()
  }, [])

  const loadMinistries = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('ministries').select('*').order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading ministries:', error)
      setLoading(false)
      return
    }

    setMinistries(data)
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

  const createMinistry = async () => {
    if (!newMinistry.name.trim()) {
      toast.error('Nome do ministério é obrigatório')
      return
    }

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
    setIsDialogOpen(false)
    setNewMinistry({ name: '', description: '', color: '#8B5CF6' })
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
      toast.success('Você entrou no ministério!')
    }
  }

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
        {/* Header */}
        <PageHeader
          title="Ministérios"
          description="Encontre seu lugar para servir e fazer a diferença"
          icon={Users}
          gradient="from-green-500 via-emerald-500 to-teal-500"
          actions={
            user?.role === 'admin' ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Ministério
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Ministério</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome do Ministério</Label>
                      <Input
                        id="name"
                        value={newMinistry.name}
                        onChange={(e) => setNewMinistry({ ...newMinistry, name: e.target.value })}
                        placeholder="Ex: Louvor e Adoração"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newMinistry.description}
                        onChange={(e) => setNewMinistry({ ...newMinistry, description: e.target.value })}
                        placeholder="Descreva o ministério..."
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Cor</Label>
                      <Input
                        id="color"
                        type="color"
                        value={newMinistry.color}
                        onChange={(e) => setNewMinistry({ ...newMinistry, color: e.target.value })}
                      />
                    </div>
                    <Button onClick={createMinistry} className="w-full">
                      Criar Ministério
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : undefined
          }
        />

        {/* Ministries Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ministries.map((ministry) => {
            const isJoined = joinedMinistries.includes(ministry.id)

            return (
              <Card
                key={ministry.id}
                className="p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl"
                style={{ borderColor: isJoined ? ministry.color : undefined }}
              >
                <div
                  className="inline-flex p-4 rounded-2xl mb-4"
                  style={{ backgroundColor: `${ministry.color}20` }}
                >
                  <Users className="h-8 w-8" style={{ color: ministry.color }} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{ministry.name}</h3>
                {ministry.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {ministry.description}
                  </p>
                )}

                <Button
                  onClick={() => toggleJoin(ministry.id)}
                  className="w-full"
                  variant={isJoined ? 'default' : 'outline'}
                  style={
                    isJoined
                      ? { backgroundColor: ministry.color, borderColor: ministry.color }
                      : undefined
                  }
                >
                  {isJoined ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Sair
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Participar
                    </>
                  )}
                </Button>
              </Card>
            )
          })}
        </div>

        {ministries.length === 0 && (
          <EmptyState
            icon={Users}
            title="Nenhum ministério cadastrado"
            description="Novos ministérios serão adicionados em breve"
          />
        )}
      </div>
    </Layout>
  )
}

export default MinistriesPage
