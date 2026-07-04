import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import type { Event } from '../../types'

interface EventEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event | null
  onSuccess: () => void
}

export function EventEditor({ open, onOpenChange, event, onSuccess }: EventEditorProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    endDate: '',
    endTime: '',
    location: '',
    category: 'Culto',
    imageUrl: '',
    maxAttendees: '',
  })

  useEffect(() => {
    if (event) {
      const startDate = new Date(event.date)
      const endDate = event.endDate ? new Date(event.endDate) : null

      setFormData({
        title: event.title,
        description: event.description || '',
        date: startDate.toISOString().split('T')[0],
        time: startDate.toTimeString().slice(0, 5),
        endDate: endDate ? endDate.toISOString().split('T')[0] : '',
        endTime: endDate ? endDate.toTimeString().slice(0, 5) : '',
        location: event.location || '',
        category: event.category || 'Culto',
        imageUrl: event.imageUrl || '',
        maxAttendees: event.maxAttendees?.toString() || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        endDate: '',
        endTime: '',
        location: '',
        category: 'Culto',
        imageUrl: '',
        maxAttendees: '',
      })
    }
  }, [event, open])

  const handleSubmit = async () => {
    if (!formData.title || !formData.date) {
      toast.error('Título e data são obrigatórios')
      return
    }

    setLoading(true)
    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`).toISOString()
      const endDateTime = formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}:00`).toISOString()
        : null

      const data = {
        title: formData.title,
        description: formData.description || null,
        date: startDateTime,
        end_date: endDateTime,
        location: formData.location || null,
        category: formData.category || null,
        image_url: formData.imageUrl || null,
        max_attendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : null,
        created_by: user!.id,
      }

      if (event) {
        const { error } = await supabase.from('events').update(data).eq('id', event.id)
        if (error) throw error
        toast.success('Evento atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('events').insert(data)
        if (error) throw error
        toast.success('Evento criado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do evento"
              />
            </div>

            <div>
              <Label htmlFor="date">Data de Início *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="time">Hora de Início *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="endDate">Data de Término</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="endTime">Hora de Término</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="location">Localização</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Local do evento"
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Culto">Culto</SelectItem>
                  <SelectItem value="Conferência">Conferência</SelectItem>
                  <SelectItem value="Retiro">Retiro</SelectItem>
                  <SelectItem value="Evento Social">Evento Social</SelectItem>
                  <SelectItem value="Treinamento">Treinamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="maxAttendees">Limite de Participantes</Label>
              <Input
                id="maxAttendees"
                type="number"
                value={formData.maxAttendees}
                onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                placeholder="Deixe vazio para ilimitado"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do evento..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : event ? 'Atualizar' : 'Criar'}
            </Button>
            <Button onClick={() => onOpenChange(false)} variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
