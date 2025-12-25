import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { HeadphonesIcon, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { CounselingRequest } from '../types'

const CounselingPage = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState<CounselingRequest[]>([])
  const [formData, setFormData] = useState({
    name: user?.username || '',
    email: user?.email || '',
    phone: '',
    subject: '',
    message: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    const { data, error } = await supabase
      .from('counseling_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading counseling requests:', error)
      return
    }

    setRequests(data)
  }

  const submitRequest = async () => {
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('counseling_requests').insert({
        user_id: user!.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      })

      if (error) throw error

      toast.success('Solicitação enviada! Em breve entraremos em contato.')
      setFormData({
        name: user?.username || '',
        email: user?.email || '',
        phone: '',
        subject: '',
        message: '',
      })
      loadRequests()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar solicitação')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente' },
      in_progress: { color: 'bg-blue-100 text-blue-700', label: 'Em Andamento' },
      resolved: { color: 'bg-green-100 text-green-700', label: 'Resolvido' },
    }
    return badges[status] || badges.pending
  }

  return (
    <Layout title="Aconselhamento">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-8 border-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <HeadphonesIcon className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Aconselhamento Pastoral</h1>
              <p className="text-white/90 text-lg">
                Estamos aqui para ouvir e ajudar você em momentos difíceis
              </p>
            </div>
          </div>
        </Card>

        {/* Request Form */}
        <Card className="p-6 border-2">
          <h2 className="text-2xl font-bold text-foreground mb-6">Nova Solicitação</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="subject">Assunto *</Label>
              <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o assunto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pessoal">Pessoal</SelectItem>
                  <SelectItem value="familiar">Familiar</SelectItem>
                  <SelectItem value="espiritual">Espiritual</SelectItem>
                  <SelectItem value="relacionamento">Relacionamento</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Descreva sua situação... (Suas informações serão tratadas com confidencialidade)"
                rows={6}
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              ℹ️ Todas as informações compartilhadas são tratadas com total confidencialidade. 
              Nossa equipe pastoral entrará em contato em até 48 horas.
            </p>
          </div>

          <Button onClick={submitRequest} disabled={loading} className="w-full mt-6" size="lg">
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
            <Send className="h-5 w-5 ml-2" />
          </Button>
        </Card>

        {/* My Requests */}
        {requests.length > 0 && (
          <Card className="p-6 border-2">
            <h2 className="text-2xl font-bold text-foreground mb-6">Minhas Solicitações</h2>

            <div className="space-y-4">
              {requests.map((request) => {
                const badge = getStatusBadge(request.status)

                return (
                  <div key={request.id} className="p-4 rounded-lg border-2 border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-foreground capitalize">{request.subject}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
                        {badge.label}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{request.message}</p>

                    {request.adminResponse && (
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">Resposta da Equipe Pastoral:</span>
                        </div>
                        <p className="text-sm text-foreground">{request.adminResponse}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default CounselingPage
