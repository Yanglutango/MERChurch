import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { Progress } from '../components/ui/progress'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  BookOpen, Download, Search, Plus, Trash2, FileText,
  BookMarked, Heart, GraduationCap, Upload, X, Shield,
  FolderOpen, HardDrive, RefreshCw, LucideIcon, AlertCircle,
  CheckCircle2, Loader2, Music, Video as VideoIcon, Image as ImageIcon, Archive, FileSpreadsheet,
  Presentation, FileCode,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SpiritualResource } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const CATEGORY_CONFIG: Record<SpiritualResource['category'], {
  icon: LucideIcon
  label: string
  gradient: string
  badge: string
}> = {
  ebook: {
    icon: BookMarked,
    label: 'E-book',
    gradient: 'from-blue-500 to-cyan-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
  },
  study: {
    icon: FileText,
    label: 'Estudo Bíblico',
    gradient: 'from-purple-500 to-pink-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
  },
  devotional: {
    icon: Heart,
    label: 'Devocional',
    gradient: 'from-rose-500 to-orange-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  discipleship: {
    icon: GraduationCap,
    label: 'Discipulado',
    gradient: 'from-green-500 to-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  other: {
    icon: BookOpen,
    label: 'Outro',
    gradient: 'from-gray-500 to-slate-500',
    badge: 'bg-slate-50 text-slate-700 border-slate-100 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  },
}

const getCategoryConfig = (category: SpiritualResource['category']) =>
  CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other

// Função para determinar o ícone de acordo com o tipo de arquivo
const getFileIcon = (fileType: string | undefined): LucideIcon => {
  const ext = (fileType || '').toLowerCase()
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return Music
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return VideoIcon
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon
  if (['zip', 'rar', '7z'].includes(ext)) return Archive
  if (['xls', 'xlsx', 'ods', 'csv'].includes(ext)) return FileSpreadsheet
  if (['ppt', 'pptx', 'odp'].includes(ext)) return Presentation
  if (['js', 'ts', 'html', 'css', 'json'].includes(ext)) return FileCode
  return FileText
}

// Todos os tipos de arquivo aceitos — plataforma ministerial completa
const ACCEPTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.epub', '.odt', '.txt', '.rtf',
  '.ppt', '.pptx', '.odp',
  '.xls', '.xlsx', '.ods', '.csv',
  '.mp3', '.wav', '.ogg', '.m4a', '.aac',
  '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.zip', '.rar', '.7z',
]
const ACCEPTED_MIME_ACCEPT = ACCEPTED_EXTENSIONS.join(',')
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const ResourcesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [resources, setResources] = useState<SpiritualResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileValidationError, setFileValidationError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    category: 'study' as SpiritualResource['category'],
    tags: '',
  })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'
  // Todos os membros autenticados podem contribuir
  const canUpload = !!user && !isGuest

  useEffect(() => { loadResources() }, [])

  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  const loadResources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('spiritual_resources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading resources:', error)
        toast.error('Erro ao carregar acervo de recursos')
        return
      }
      setResources(data as any)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = useMemo(() => {
    let filtered = resources
    if (categoryFilter !== 'all') filtered = filtered.filter(r => r.category === categoryFilter)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        (Array.isArray(r.tags) && r.tags.some(tag => String(tag).toLowerCase().includes(query)))
      )
    }
    return filtered
  }, [resources, searchQuery, categoryFilter])

  const validateFile = useCallback((file: File | undefined): string | null => {
    if (!file) return null
    const fileExtension = '.' + (file.name.split('.').pop() || '').toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(fileExtension)) {
      return `Formato "${fileExtension}" não é suportado. Consulte os tipos aceitos abaixo.`
    }
    if (file.size > MAX_FILE_SIZE) {
      return `O arquivo excede o limite de ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
    }
    return null
  }, [])

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const error = validateFile(file)
    if (error) { setFileValidationError(error); setSelectedFile(null); toast.error(error); return }
    setFileValidationError(null)
    setSelectedFile(file)
  }, [validateFile])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const error = validateFile(file)
    if (error) { setFileValidationError(error); setSelectedFile(null); toast.error(error); return }
    setFileValidationError(null)
    setSelectedFile(file)
  }, [validateFile])

  const uploadResource = async () => {
    if (!selectedFile || !newResource.title.trim()) {
      toast.error('Preencha o título e selecione um arquivo válido')
      return
    }
    const validationError = validateFile(selectedFile)
    if (validationError) { toast.error(validationError); return }

    setUploading(true)
    setUploadProgress(0)
    abortControllerRef.current = new AbortController()

    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase()
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${user!.id}/${Date.now()}-${safeName}`

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 20, 88))
      }, 400)

      const { error: uploadError } = await supabase.storage
        .from('spiritual-resources')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

      clearInterval(progressInterval)
      setUploadProgress(93)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('spiritual-resources')
        .getPublicUrl(filePath)

      const tags = newResource.tags.split(',').map(t => t.trim()).filter(Boolean)

      const { error: dbError } = await supabase
        .from('spiritual_resources')
        .insert({
          title: newResource.title,
          description: newResource.description,
          category: newResource.category,
          file_url: publicUrl,
          file_type: fileExt,
          file_size: selectedFile.size,
          tags,
          created_by: user!.id,
          downloads_count: 0,
        })

      if (dbError) throw dbError

      setUploadProgress(100)
      await new Promise(resolve => setTimeout(resolve, 500))

      toast.success('Recurso publicado com sucesso no acervo!')
      setDialogOpen(false)
      setSelectedFile(null)
      setFileValidationError(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      setUploadProgress(0)
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erro ao publicar o arquivo')
      setUploadProgress(0)
    } finally {
      setUploading(false)
      abortControllerRef.current = null
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    const resourceId = resource.id
    if (downloadingIds.has(resourceId)) { toast.info('Este arquivo já está sendo baixado'); return }
    setDownloadingIds(prev => new Set([...prev, resourceId]))

    try {
      const downloadUrl = (resource as any).file_url || (resource as any).fileUrl
      if (!downloadUrl) { toast.error('URL de download não disponível'); return }
      window.open(downloadUrl, '_blank')
      toast.success('Download iniciado!')

      // Fallback update sem RPC customizada que pode não existir
      await supabase
        .from('spiritual_resources')
        .update({ downloads_count: ((resource as any).downloads_count || 0) + 1 })
        .eq('id', resourceId)

      setResources(prev => prev.map(r =>
        r.id === resourceId ? { ...r, downloads_count: ((r as any).downloads_count || 0) + 1 } : r
      ))
    } finally {
      setDownloadingIds(prev => { const s = new Set(prev); s.delete(resourceId); return s })
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const resourceToDelete = resources.find(r => r.id === deleteTargetId)
      if (!resourceToDelete) { toast.error('Recurso não encontrado'); return }

      const fileUrl = (resourceToDelete as any).file_url
      if (fileUrl) {
        const match = fileUrl.match(/\/storage\/v1\/object\/public\/spiritual-resources\/(.+)/)
        if (match?.[1]) {
          await supabase.storage.from('spiritual-resources').remove([decodeURIComponent(match[1])])
        }
      }

      const { data, error } = await supabase
        .from('spiritual_resources').delete().eq('id', deleteTargetId).select('id')

      if (error) { toast.error('Não foi possível remover o recurso'); return }
      if (!data || data.length === 0) { toast.error('Sem permissão para remover este recurso'); return }

      setResources(prev => prev.filter(r => r.id !== deleteTargetId))
      toast.success('Recurso removido com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover recurso')
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (uploading) { toast.error('Operação em andamento. Aguarde...'); return }
    setDialogOpen(open)
    if (!open) { setSelectedFile(null); setFileValidationError(null); setUploadProgress(0) }
  }

  if (loading) {
    return <Layout title="Recursos Espirituais"><LoadingState fullScreen message="Sincronizando acervo espiritual..." /></Layout>
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">

        {/* ===== HERO ===== */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/70 mix-blend-multiply" />
          <div aria-hidden className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div aria-hidden className="absolute -left-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 p-6 md:p-12 lg:p-16 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-inner">
                <BookOpen className="h-4 w-4 text-amber-300" />
                <span className="text-xs md:text-sm font-semibold tracking-wider uppercase text-slate-100">Biblioteca Ministerial</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Recursos{' '}
                <span className="bg-gradient-to-r from-amber-200 via-white to-orange-200 bg-clip-text text-transparent">
                  Espirituais
                </span>
              </h1>
              <p className="text-base md:text-lg text-slate-100/90 font-normal leading-relaxed">
                {isAdmin
                  ? 'Gerencie, publique e acompanhe downloads de todos os materiais ministeriais da comunidade.'
                  : isGuest
                  ? 'Acesse materiais ministeriais. Crie uma conta para fazer upload e download de recursos.'
                  : 'Acesse e contribua com PDF, vídeos, áudios, apresentações e mais — para edificar a comunidade.'}
              </p>
            </div>

            {canUpload && (
              <Button
                size="lg"
                onClick={() => setDialogOpen(true)}
                disabled={uploading}
                className="bg-white text-indigo-950 hover:bg-slate-50 font-bold px-6 py-6 h-auto text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 disabled:opacity-50 disabled:cursor-not-allowed self-start md:self-auto"
              >
                <Upload className="mr-2 h-5 w-5 stroke-[2.5]" />
                {isAdmin ? 'Adicionar Recurso' : 'Contribuir com Recurso'}
              </Button>
            )}
          </div>
        </Card>

        {/* ===== UPLOAD DIALOG ===== */}
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-600" />
                  {isAdmin ? 'Adicionar Recurso' : 'Contribuir com Recurso'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">PDF, Word, PowerPoint, MP3, MP4, imagens, ZIP e muito mais.</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDialogOpenChange(false)} disabled={uploading} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-5 pt-4">
              {fileValidationError && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{fileValidationError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input value={newResource.title} onChange={e => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Ex: Guia de Discipulado — Módulo I" className="rounded-xl h-11" disabled={uploading} maxLength={200} />
                  <p className="text-xs text-muted-foreground">{newResource.title.length}/200</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select value={newResource.category} onValueChange={(v: any) => setNewResource({ ...newResource, category: v })} disabled={uploading}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Object.keys(CATEGORY_CONFIG) as SpiritualResource['category'][]).map(key => (
                        <SelectItem key={key} value={key}>{CATEGORY_CONFIG[key].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                <Textarea value={newResource.description} onChange={e => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Descreva brevemente o conteúdo e a finalidade deste recurso..." className="rounded-xl resize-none" rows={3} disabled={uploading} maxLength={500} />
                <p className="text-xs text-muted-foreground">{newResource.description.length}/500</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (separadas por vírgula)</Label>
                <Input value={newResource.tags} onChange={e => setNewResource({ ...newResource, tags: e.target.value })}
                  placeholder="ex: liderança, oração, família" className="rounded-xl h-11" disabled={uploading} />
              </div>

              {/* File Upload Zone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Arquivo (Máx 50MB) <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">PDF, Word, PowerPoint, Excel, MP3, MP4, imagens (JPG/PNG), ZIP e mais</p>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_MIME_ACCEPT} onChange={handleFileSelect} className="hidden" disabled={uploading} />

                <div
                  className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                    dragActive ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/80 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/60'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                  onClick={() => !uploading && !selectedFile && fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-4 w-full text-left bg-card border rounded-xl p-3 shadow-sm" onClick={e => e.stopPropagation()}>
                      <div className="h-12 w-12 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {(() => { const Icon = getFileIcon(selectedFile.name.split('.').pop()); return <Icon className="h-6 w-6" /> })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-foreground">{selectedFile.name}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedFile(null); setFileValidationError(null) }} disabled={uploading}
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0" aria-label="Remover">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 pointer-events-none">
                      <div className="mx-auto h-12 w-12 text-muted-foreground bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl flex items-center justify-center">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Clique para selecionar</span>{' '}
                        ou arraste o arquivo aqui
                      </div>
                      <p className="text-xs text-muted-foreground">Qualquer formato de documento, mídia ou arquivo — até 50MB</p>
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Enviando arquivo...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-12 rounded-xl font-semibold" onClick={() => handleDialogOpenChange(false)} disabled={uploading}>
                  Cancelar
                </Button>
                <Button onClick={uploadResource} disabled={uploading || !selectedFile || !newResource.title.trim()}
                  className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publicando...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4" />Publicar no Acervo</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Total Cadastrado" value={resources.length} gradient="from-indigo-600 to-purple-600" />
          <StatCard icon={FileText} label="Estudos Bíblicos" value={resources.filter(r => r.category === 'study').length} gradient="from-purple-600 to-pink-600" />
          <StatCard icon={Heart} label="Devocionais" value={resources.filter(r => r.category === 'devotional').length} gradient="from-rose-600 to-orange-600" />
          <StatCard icon={Download} label="Total Downloads" value={resources.reduce((sum, r) => sum + ((r as any).downloads_count || 0), 0)} gradient="from-emerald-600 to-teal-600" />
        </div>

        {/* ===== FILTERS ===== */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por títulos, palavras-chave ou tags..."
              className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 bg-muted/30" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors" aria-label="Limpar">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-full md:w-72">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-muted/30">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Filtrar por Categoria" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todas as categorias</SelectItem>
                {(Object.keys(CATEGORY_CONFIG) as SpiritualResource['category'][]).map(key => (
                  <SelectItem key={key} value={key}>{CATEGORY_CONFIG[key].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ===== RESOURCES GRID ===== */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const config = getCategoryConfig(resource.category)
              const CategoryIcon = config.icon
              const FileIcon = getFileIcon((resource as any).file_type)
              const isDownloading = downloadingIds.has(resource.id)

              return (
                <Card key={resource.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-lg transition-all duration-300">
                  <div className="p-5 md:p-6 flex-1">
                    <div className="flex justify-between items-start gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${config.badge}`}>
                        <CategoryIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        {config.label}
                      </span>
                      {isAdmin && (
                        <AdminAction>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTargetId(resource.id)} disabled={deleting}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 disabled:opacity-50"
                            title="Remover Recurso" aria-label={`Remover ${resource.title}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">{resource.description}</p>
                    )}

                    {Array.isArray(resource.tags) && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-medium rounded-md whitespace-nowrap">
                            #{tag}
                          </span>
                        ))}
                        {resource.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-[11px] font-medium text-muted-foreground">+{resource.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-5 md:px-6 pb-5 md:pb-6 mt-auto space-y-3">
                    <div className="flex items-center justify-between pt-3 border-t text-[11px] font-medium text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" />
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {(resource as any).file_type?.toUpperCase() || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatFileSize((resource as any).file_size || 0)}</span>
                      </div>
                      <div>{(resource as any).downloads_count || 0} downloads</div>
                    </div>

                    <Button onClick={() => handleDownload(resource)} disabled={isDownloading || isGuest}
                      className={`w-full font-bold h-11 rounded-xl shadow-sm bg-gradient-to-r ${config.gradient} text-white hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={isGuest ? 'Faça login para baixar' : 'Baixar arquivo'}>
                      {isDownloading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Baixando...</>
                      ) : (
                        <><Download className="mr-2 h-4 w-4" />Baixar Arquivo</>
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="Nenhum registro localizado"
            description={searchQuery || categoryFilter !== 'all' ? 'Redefina os filtros para encontrar outros conteúdos.' : 'Nenhum recurso publicado ainda. Seja o primeiro a contribuir!'}
            action={(searchQuery || categoryFilter !== 'all') ? (
              <Button variant="outline" onClick={() => { setSearchQuery(''); setCategoryFilter('all') }} className="rounded-xl">
                <RefreshCw className="mr-2 h-4 w-4" />Limpar Filtros
              </Button>
            ) : undefined}
          />
        )}

        {isGuest && resources.length > 0 && (
          <GuestPrompt title="Acesso total aos recursos" description="Membros têm acesso irrestrito a downloads e podem contribuir com materiais para a comunidade."
            actionLabel="Criar Conta" onAction={() => navigate('/auth')} />
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover recurso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O arquivo será removido do servidor permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin inline" />Removendo...</> : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default ResourcesPage
