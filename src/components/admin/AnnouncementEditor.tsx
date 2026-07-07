import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Save, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Announcement } from '../../types'

interface AnnouncementEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcement: Announcement | null
  onSuccess: () => void
}

const EMPTY_FORM = {
  title: '',
  content: '',
  category: 'institutional' as Announcement['category'],
  image_url: '',
}

export const AnnouncementEditor = ({ open, onOpenChange, announcement, onSuccess }: AnnouncementEditorProps) => {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (announcement) {
      setForm({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        image_url: announcement.image_url || announcement.imageUrl || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [announcement, open])

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        image_url: form.image_url.trim() || null,
        published: true,
        author_name: user?.username || 'Administração',
        created_by: user?.id,
      }

      if (announcement) {
        const { error } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id)
        if (error) throw error
        toast.success('Anúncio atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(payload)
        if (error) throw error
        toast.success('Anúncio publicado com sucesso!')
      }

      onSuccess()
    } catch (err: any) {
      console.error('AnnouncementEditor error:', err)
      toast.error(err.message || 'Erro ao salvar anúncio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            {announcement ? 'Editar Anúncio' : 'Criar Novo Anúncio'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label className="font-bold text-sm mb-1.5 block">Título *</Label>
            <Input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Título do comunicado..."
              className="h-10"
            />
          </div>

          <div>
            <Label className="font-bold text-sm mb-1.5 block">Categoria</Label>
            <Select
              value={form.category}
              onValueChange={v => setForm({ ...form, category: v as Announcement['category'] })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="spiritual">Espiritual</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="institutional">Institucional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-bold text-sm mb-1.5 block">Imagem (URL)</Label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
                className="h-10 pl-9"
              />
            </div>
          </div>

          <div>
            <Label className="font-bold text-sm mb-1.5 block">Conteúdo *</Label>
            <Textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Digite o conteúdo do comunicado..."
              rows={5}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1 h-10 font-bold"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !form.content.trim()}
              className="flex-1 h-10 font-bold bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white"
            >
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gravando...</>
                : <><Save className="mr-2 h-4 w-4" />{announcement ? 'Atualizar' : 'Publicar'}</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
