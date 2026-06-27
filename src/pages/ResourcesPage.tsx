import { useState, useEffect, useMemo, useRef } from 'react'
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
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  BookOpen, Download, Search, Plus, Trash2, FileText,
  BookMarked, Heart, GraduationCap, Upload, X, Shield,
  FolderOpen, HardDrive, RefreshCw, LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SpiritualResource } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

// Configuração estruturada por categoria — substitui a indexação por posição
// de string (`gradientParts[2]`), que quebrava silenciosamente se alguém
// editasse uma única entrada de `categoryColors` sem actualizar as outras.
// Já inclui variantes `dark:` que faltavam em todos os badges.
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

const ResourcesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [resources, setResources] = useState<SpiritualResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    category: 'study' as const,
    tags: '',
  })

  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('spiritual_resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading resources:', error)
      toast.error('Erro ao carregar acervo de recursos')
      setLoading(false)
      return
    }

    setResources(data as any)
    setLoading(false)
  }

  // useMemo em vez de useEffect+state extra: elimina um ciclo de render
  // por cada tecla digitada na busca (antes: render → effect → setState →
  // render de novo; agora: cálculo directo no mesmo render).
  const filteredResources = useMemo(() => {
    let filtered = resources

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [resources, searchQuery, categoryFilter])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    validateAndSetFile(file)
  }

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB')
      return
    }

    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const uploadResource = async () => {
    if (!selectedFile || !newResource.title.trim()) {
      toast.error('Preencha o título e selecione um arquivo válido')
      return
    }

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('spiritual-resources')
        .upload(filePath, selectedFile)

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
        })

      if (dbError) throw dbError

      toast.success('Recurso publicado com sucesso no acervo!')
      setDialogOpen(false)
      setSelectedFile(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erro ao efetuar publicação do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    // Atualização optimista local — evita recarregar toda a lista de
    // recursos da rede só para reflectir +1 num contador.
    setResources(prev => prev.map(r =>
      r.id === resource.id ? { ...r, downloadsCount: (r.downloadsCount || 0) + 1 } : r
    ))

    window.open(resource.fileUrl, '_blank')
    toast.success('Download iniciado com sucesso!')

    const { error } = await supabase
      .from('spiritual_resources')
      .update({ downloads_count: (resource.downloadsCount || 0) + 1 })
      .eq('id', resource.id)

    if (error) {
      // Não bloqueia o download (já aconteceu) — só regista.
      // Nota: este incremento não é atómico; em concorrência alta o ideal
      // é uma função RPC (increment_downloads), no mesmo padrão já usado
      // para likes/orações neste projecto.
      console.warn('Não foi possível registar o download no servidor:', error)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)

    const { data, error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', deleteTargetId)
      .select('id')

    setDeleting(false)

    if (error) {
      toast.error('Não foi possível remover o recurso do banco')
      setDeleteTargetId(null)
      return
    }
    if (!data || data.length === 0) {
      toast.error('Sem permissão para remover este recurso')
      setDeleteTargetId(null)
      return
    }

    setResources(prev => prev.filter(r => r.id !== deleteTargetId))
    toast.success('Recurso removido com sucesso!')
    setDeleteTargetId(null)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Recursos Espirituais">
        <LoadingState fullScreen message="Sincronizando acervo espiritual..." />
      </Layout>
    )
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">

        {/* Hero Section — fora do Dialog: não tem relação com o modal de upload */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl bg-slate-950">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/80 to-pink-600/70 mix-blend-multiply" />
          <div aria-hidden="true" className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div aria-hidden="true" className="absolute -left-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl" />

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
                  ? 'Publique, acompanhe downloads e gerencie e-books, estudos e devocionais.'
                  : 'Acesse e-books, estudos teológicos, devocionais e guias práticos desenvolvidos para apoiar seu crescimento integral.'}
              </p>
            </div>

            {isAdmin && (
              <AdminAction>
                <Button
                  size="lg"
                  onClick={() => setDialogOpen(true)}
                  className="bg-white text-indigo-950 hover:bg-slate-50 font-bold px-6 py-6 h-auto text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-100 shrink-0 self-start md:self-center"
                >
                  <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                  Adicionar Recurso
                </Button>
              </AdminAction>
            )}
          </div>
        </Card>

        {/* Upload Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl rounded-2xl p-6">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Novo Recurso
                </DialogTitle>
                <p className="text-xs text-muted-foreground">Adicione e disponibilize arquivos para download geral.</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setDialogOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título do Recurso *</Label>
                  <Input
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Ex: Teologia Sistemática e Hermenêutica"
                    className="rounded-xl h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria *</Label>
                  <Select
                    value={newResource.category}
                    onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
                  >
                    <SelectTrigger className="rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {(Object.keys(CATEGORY_CONFIG) as SpiritualResource['category'][]).map(key => (
                        <SelectItem key={key} value={key}>{CATEGORY_CONFIG[key].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição Breve</Label>
                <Textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Insira detalhes resumidos sobre a finalidade pedagógica ou espiritual deste arquivo..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags (separadas por vírgula)</Label>
                <Input
                  value={newResource.tags}
                  onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                  placeholder="ex: lideranca, devocional, igreja"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload de Arquivo (Máx 10MB) *</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.epub"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  className={`mt-1 border-2 border-dashed rounded-2xl p-6 transition-all duration-200 text-center flex flex-col items-center justify-center min-h-[140px] ${
                    dragActive
                      ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-900/60'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="flex items-center gap-4 w-full text-left bg-card border rounded-xl p-3 shadow-sm">
                      <div className="h-12 w-12 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-foreground">{selectedFile.name}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedFile(null)}
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="Remover arquivo selecionado"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="space-y-2 cursor-pointer w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="mx-auto h-10 w-10 text-muted-foreground bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm rounded-xl flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-indigo-600 hover:text-indigo-500">Clique para selecionar</span> ou arraste o documento aqui
                      </div>
                      <p className="text-xs text-muted-foreground">Formatos aceitos: PDF, DOC, DOCX ou EPUB de até 10 megabytes</p>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-xl font-semibold"
                  onClick={() => setDialogOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={uploadResource}
                  disabled={uploading}
                  className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100"
                >
                  {uploading ? 'Processando upload...' : 'Publicar no Acervo'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Analytics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Total Cadastrado"
            value={resources.length}
            gradient="from-indigo-600 to-purple-600"
          />
          <StatCard
            icon={FileText}
            label="Estudos Bíblicos"
            value={resources.filter(r => r.category === 'study').length}
            gradient="from-purple-600 to-pink-600"
          />
          <StatCard
            icon={Heart}
            label="Devocionais"
            value={resources.filter(r => r.category === 'devotional').length}
            gradient="from-rose-600 to-orange-600"
          />
          <StatCard
            icon={Download}
            label="Total Downloads"
            value={resources.reduce((sum, r) => sum + (r.downloadsCount || 0), 0)}
            gradient="from-emerald-600 to-teal-600"
          />
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por títulos, palavras-chave ou tags..."
              className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500 bg-muted/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-full md:w-72">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 rounded-xl border-slate-200 dark:border-slate-700 focus:ring-indigo-500 bg-muted/30">
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

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const config = getCategoryConfig(resource.category)
              const CategoryIcon = config.icon

              return (
                <Card
                  key={resource.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl bg-card"
                >
                  <div className="p-5 md:p-6 flex-1">
                    <div className="flex justify-between items-center mb-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${config.badge}`}>
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </span>

                      {isAdmin && (
                        <AdminAction>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTargetId(resource.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            title="Remover Recurso"
                            aria-label={`Remover ${resource.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                        {resource.description}
                      </p>
                    )}

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-medium rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-5 md:px-6 pb-5 md:pb-6 mt-auto space-y-4">
                    <div className="grid grid-cols-3 gap-1 pt-3 border-t text-[11px] font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="truncate">{resource.fileType?.toUpperCase() || 'DOC'}</span>
                      </div>
                      <div className="flex items-center gap-1 justify-center">
                        <HardDrive className="h-3 w-3 shrink-0" />
                        <span>{formatFileSize(resource.fileSize || 0)}</span>
                      </div>
                      <div className="text-right truncate">
                        {resource.downloadsCount || 0} downloads
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDownload(resource)}
                      className={`w-full font-bold h-11 rounded-xl shadow-sm bg-gradient-to-r ${config.gradient} text-white hover:opacity-95 transition-opacity`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Arquivo
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Nenhum registro localizado"
            description={
              searchQuery || categoryFilter !== 'all'
                ? 'Redefina os parâmetros de pesquisa para encontrar conteúdos adicionais.'
                : 'Novas diretrizes e recursos serão postados pelo administrador em breve.'
            }
            action={
              (searchQuery || categoryFilter !== 'all') ? (
                <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Limpar Filtros e Busca
                </Button>
              ) : undefined
            }
          />
        )}

        {isGuest && resources.length > 0 && (
          <GuestPrompt
            title="Acesso total aos recursos estratégicos"
            description="Membros matriculados ativos ganham permissão irrestrita para download e arquivamento de todos os materiais teológicos e ebooks."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O arquivo deixará de estar disponível para download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default ResourcesPage
