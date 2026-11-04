import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Image as ImageIcon, Link2, Loader2, Mic2, Music2, Play, Save, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { Sermon } from '../../types'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'

interface SermonEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sermon: Sermon | null
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'evangelismo', label: 'Evangelismo' },
  { value: 'adoracao', label: 'Adoração' },
  { value: 'discipulado', label: 'Discipulado' },
  { value: 'familia', label: 'Família' },
  { value: 'fe', label: 'Fé' },
  { value: 'cura', label: 'Cura' },
  { value: 'profecia', label: 'Profecia' },
  { value: 'missoes', label: 'Missões' },
]

const blankForm = {
  title: '',
  speaker: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'fe',
  description: '',
  videoUrl: '',
  audioUrl: '',
  thumbnailUrl: '',
}

type SermonForm = typeof blankForm

const isValidWebUrl = (value: string) => {
  if (!value.trim()) return true
  try {
    const url = new URL(value.trim())
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
  } catch {
    return false
  }
}

const fieldClass = 'h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0A2E4A]/25 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500'

export const SermonEditor = ({ open, onOpenChange, sermon, onSuccess }: SermonEditorProps) => {
  const [form, setForm] = useState<SermonForm>(blankForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(sermon ? {
      title: sermon.title || '',
      speaker: sermon.speaker || '',
      date: sermon.date ? new Date(sermon.date).toISOString().slice(0, 10) : blankForm.date,
      category: sermon.category || 'fe',
      description: sermon.description || '',
      videoUrl: sermon.videoUrl || '',
      audioUrl: sermon.audioUrl || '',
      thumbnailUrl: sermon.thumbnailUrl || '',
    } : { ...blankForm })
  }, [sermon, open])

  const previewImage = useMemo(() => isValidWebUrl(form.thumbnailUrl) ? form.thumbnailUrl.trim() : '', [form.thumbnailUrl])
  const setField = <K extends keyof SermonForm>(key: K, value: SermonForm[K]) => {
    setForm(current => ({ ...current, [key]: value }))
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim() || !form.speaker.trim() || !form.date) {
      toast.error('Preencha o título, pregador e data da mensagem.')
      return
    }

    const urlFields = [
      ['link do vídeo', form.videoUrl],
      ['link do áudio', form.audioUrl],
      ['link da imagem', form.thumbnailUrl],
    ] as const
    const invalidUrl = urlFields.find(([, value]) => !isValidWebUrl(value))
    if (invalidUrl) {
      toast.error(`Informe uma URL HTTP ou HTTPS válida para ${invalidUrl[0]}.`)
      return
    }

    setSaving(true)
    const payload = {
      title: form.title.trim(),
      speaker: form.speaker.trim(),
      date: new Date(`${form.date}T12:00:00`).toISOString(),
      category: form.category,
      description: form.description.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      audioUrl: form.audioUrl.trim() || null,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      views: sermon?.views ?? 0,
    }

    try {
      const result = sermon
        ? await supabase.from('sermons').update(payload).eq('id', sermon.id)
        : await supabase.from('sermons').insert(payload)

      if (result.error) throw result.error
      toast.success(sermon ? 'Sermão atualizado.' : 'Sermão publicado.')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('SermonEditor save error:', error)
      toast.error('Não foi possível salvar o sermão. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!saving) onOpenChange(nextOpen) }}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto rounded-[28px] border border-slate-200 bg-[#f7f8fa] p-0 shadow-[0_32px_90px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-[#0b1420]">
        <div className="relative overflow-hidden rounded-t-[28px] bg-slate-950 px-6 py-6 text-white md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,176,122,0.22),transparent_35%),linear-gradient(115deg,#07111c,#102f47)]" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#d8b07a]">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogHeader className="space-y-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d8b07a]">KAIRÓS · Biblioteca</p>
              <DialogTitle className="text-xl font-black tracking-[-0.04em] text-white md:text-2xl">
                {sermon ? 'Editar sermão' : 'Publicar novo sermão'}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-300">
                Organize os detalhes e mídias da mensagem para a comunidade.
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid gap-5 p-5 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)] md:p-7">
          <div className="space-y-5">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Informações da mensagem</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Os campos marcados com * são obrigatórios.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sermon-title" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Título *</Label>
                <Input id="sermon-title" autoFocus value={form.title} onChange={event => setField('title', event.target.value)} maxLength={160} placeholder="Ex.: A esperança que não decepciona" className={fieldClass} required />
                <p className="text-right text-[10px] text-slate-400">{form.title.length}/160</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sermon-speaker" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Pregador(a) *</Label>
                  <div className="relative">
                    <Mic2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="sermon-speaker" value={form.speaker} onChange={event => setField('speaker', event.target.value)} maxLength={100} placeholder="Nome do pregador" className={`${fieldClass} pl-10`} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sermon-date" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Data *</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input id="sermon-date" type="date" value={form.date} onChange={event => setField('date', event.target.value)} className={`${fieldClass} pl-10`} required />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Categoria</Label>
                <Select value={form.category} onValueChange={value => setField('category', value)}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm dark:border-slate-700 dark:bg-slate-800">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sermon-description" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Descrição</Label>
                <Textarea id="sermon-description" value={form.description} onChange={event => setField('description', event.target.value)} maxLength={1200} rows={5} placeholder="Contextualize a mensagem e ajude as pessoas a saber o que encontrar..." className="resize-y rounded-xl border-slate-200 bg-slate-50 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-800" />
                <p className="text-right text-[10px] text-slate-400">{form.description.length}/1200</p>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Mídia</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use links HTTP ou HTTPS. Mídia é opcional.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sermon-video" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Vídeo</Label>
                <Input id="sermon-video" type="url" inputMode="url" value={form.videoUrl} onChange={event => setField('videoUrl', event.target.value)} placeholder="https://..." className={fieldClass} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sermon-audio" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Áudio</Label>
                <Input id="sermon-audio" type="url" inputMode="url" value={form.audioUrl} onChange={event => setField('audioUrl', event.target.value)} placeholder="https://..." className={fieldClass} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sermon-thumbnail" className="text-xs font-semibold text-slate-700 dark:text-slate-200">Imagem de capa</Label>
                <Input id="sermon-thumbnail" type="url" inputMode="url" value={form.thumbnailUrl} onChange={event => setField('thumbnailUrl', event.target.value)} placeholder="https://..." className={fieldClass} />
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pré-visualização</p>
              </div>
              <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                {previewImage ? (
                  <img src={previewImage} alt="Pré-visualização da capa" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm dark:bg-slate-900">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">A capa aparecerá aqui</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 text-white">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#e2c18d]">{CATEGORIES.find(category => category.value === form.category)?.label || 'Sermão'}</div>
                  <p className="line-clamp-2 text-base font-bold">{form.title.trim() || 'Título da mensagem'}</p>
                </div>
              </div>
              <div className="space-y-2 p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Mic2 className="h-3.5 w-3.5 text-[#b58a54]" />{form.speaker.trim() || 'Nome do pregador'}
                </p>
                <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {form.date ? new Date(`${form.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Data da mensagem'}
                </p>
                {form.description.trim() && <p className="line-clamp-3 border-t border-slate-100 pt-2 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">{form.description}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8b07a]/30 bg-[#d8b07a]/10 p-4 dark:bg-[#d8b07a]/5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#d8b07a]/20 text-[#8a6538] dark:text-[#e5c798]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Dica editorial</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Um título claro, uma boa descrição e uma imagem de capa ajudam a comunidade a encontrar e revisitar esta mensagem.</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-11 rounded-full border-slate-200 px-6 dark:border-slate-700">
              Cancelar
            </Button>
            <Button type="submit" form="sermon-editor-form" disabled={saving || !form.title.trim() || !form.speaker.trim() || !form.date} className="h-11 rounded-full bg-[#0A2E4A] px-7 font-bold text-white hover:bg-[#0d3a5c]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />{sermon ? 'Salvar alterações' : 'Publicar sermão'}</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
