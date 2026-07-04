import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Checkbox } from '../ui/checkbox'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import type { Course } from '../../types'

interface CourseEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course?: Course | null
  onSuccess: () => void
}

export function CourseEditor({ open, onOpenChange, course, onSuccess }: CourseEditorProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    durationHours: '',
    thumbnailUrl: '',
    isPublished: false,
  })

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description || '',
        level: course.level || 'beginner',
        durationHours: course.durationHours?.toString() || '',
        thumbnailUrl: course.thumbnailUrl || '',
        isPublished: course.isPublished || false,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        level: 'beginner',
        durationHours: '',
        thumbnailUrl: '',
        isPublished: false,
      })
    }
  }, [course, open])

  const handleSubmit = async () => {
    if (!formData.title) {
      toast.error('Título é obrigatório')
      return
    }

    setLoading(true)
    try {
      const data = {
        title: formData.title,
        description: formData.description || null,
        level: formData.level || null,
        duration_hours: formData.durationHours ? parseInt(formData.durationHours) : null,
        thumbnail_url: formData.thumbnailUrl || null,
        is_published: formData.isPublished,
        instructor_id: user!.id,
      }

      if (course) {
        const { error } = await supabase.from('courses').update(data).eq('id', course.id)
        if (error) throw error
        toast.success('Curso atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('courses').insert(data)
        if (error) throw error
        toast.success('Curso criado com sucesso!')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{course ? 'Editar Curso' : 'Novo Curso'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Nome do curso"
              />
            </div>

            <div>
              <Label htmlFor="level">Nível</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="durationHours">Duração (horas)</Label>
              <Input
                id="durationHours"
                type="number"
                value={formData.durationHours}
                onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
                placeholder="Ex: 10"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do curso..."
                rows={4}
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

            <div className="col-span-2 flex items-center space-x-2">
              <Checkbox
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isPublished: checked as boolean })
                }
              />
              <label
                htmlFor="isPublished"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Publicar curso (visível para membros)
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : course ? 'Atualizar' : 'Criar'}
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
