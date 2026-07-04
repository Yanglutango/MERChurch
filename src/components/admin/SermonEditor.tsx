import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import type { Sermon } from '../../types'

interface SermonEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sermon?: Sermon | null
  onSuccess: () => void
}

export function SermonEditor({ open, onOpenChange, sermon, onSuccess }: SermonEditorProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    speaker: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Culto',
    videoUrl: '',
    audioUrl: '',
    thumbnailUrl: '',
  })

  useEffect(() => {
    if (sermon) {
      setFormData({
        title: sermon.title,
        description: sermon.description || '',
        speaker: sermon.speaker,
        date: new Date(sermon.date).toISOString().split('T')[0],
        category: sermon.category || 'Culto',
        videoUrl: sermon.videoUrl || '',
        audioUrl: sermon.audioUrl || '',
        thumbnailUrl: sermon.thumbnailUrl || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        speaker: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Culto',
        videoUrl: '',
        audioUrl: '',
        thumbnailUrl: '',
      })
    }
  }, [sermon, open])

  const handleSubmit = async () => {
    if (!formData.title || !formData.speaker) {
      toast.error('Título e pregador são obrigatórios')
      return
    }

    setLoading(true)
    try {
      const data = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      }

      if (sermon) {
        const { error } = await supabase.from('sermons').update(data).eq('id', sermon.id)
        if (error) throw error
        toast.success('Sermão atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('sermons').insert(data)
        if (error) throw error
        toast.success('Sermão criado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar sermão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sermon ? 'Editar Sermão' : 'Novo Sermão'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título do sermão"
              />
            </div>

            <div>
              <Label htmlFor="speaker">Pregador *</Label>
              <Input
                id="speaker"
                value={formData.speaker}
                onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                placeholder="Nome do pregador"
              />
            </div>

            <div>
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="col-span-2">
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
                  <SelectItem value="Série">Série</SelectItem>
                  <SelectItem value="Especial">Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do sermão..."
                rows={3}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="videoUrl">URL do Vídeo</Label>
              <Input
                id="videoUrl"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/..."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="audioUrl">URL do Áudio</Label>
              <Input
                id="audioUrl"
                value={formData.audioUrl}
                onChange={(e) => setFormData({ ...formData, audioUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="thumbnailUrl">URL da Capa</Label>
              <Input
                id="thumbnailUrl"
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : sermon ? 'Atualizar' : 'Criar'}
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
