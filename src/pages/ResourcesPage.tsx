import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { BookOpen, Download, Search, Plus, Trash2, FileText, BookMarked, Heart, GraduationCap, Upload, X, Shield, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import type { SpiritualResource } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'

const ResourcesPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [resources, setResources] = useState<SpiritualResource[]>([])
  const [filteredResources, setFilteredResources] = useState<SpiritualResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
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

  useEffect(() => {
    filterResources()
  }, [resources, searchQuery, categoryFilter])

  const loadResources = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('spiritual_resources')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setResources(data as any)
    } catch (error) {
      console.error('Error loading resources:', error)
      toast.error('Erro ao carregar os recursos da biblioteca')
    } finally {
      setLoading(false)
    }
  }

  const filterResources = () => {
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

    setFilteredResources(filtered)
  }

  const handleFileValidation = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB')
      return false
    }
    const allowedExtensions = ['pdf', 'doc', 'docx', 'epub']
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !allowedExtensions.includes(ext)) {
      toast.error('Formato não suportado. Use PDF, DOC, DOCX ou EPUB.')
      return false
    }
    return true
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && handleFileValidation(file)) {
      setSelectedFile(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (handleFileValidation(file)) {
        setSelectedFile(file)
      }
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
          downloads_count: 0
        })

      if (dbError) throw dbError

      toast.success('Recurso publicado com sucesso!')
      setDialogOpen(false)
      setSelectedFile(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erro ao realizar upload do recurso')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    const currentDownloads = resource.downloads_count || resource.downloadsCount || 0
    
    await supabase
      .from('spiritual_resources')
      .update({ downloads_count: currentDownloads + 1 })
      .eq('id', resource.id)

    window.open(resource.fileUrl || (resource as any).file_url, '_blank')
    toast.success('Download iniciado com sucesso!')
    loadResources()
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Tem certeza absoluta que deseja excluir permanentemente este recurso?')) return

    const { error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao excluir o recurso')
      return
    }

    toast.success('Recurso excluído do servidor!')
    loadResources()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setCategoryFilter('all')
  }

  const categoryIcons = {
    ebook: BookMarked,
    study: FileText,
    devotional: Heart,
    discipleship: GraduationCap,
    other: BookOpen,
  }

  const categoryColors = {
    ebook: 'from-blue-500 to-cyan-500 text-blue-500 bg-blue-50 dark:bg-blue-950/30',
    study: 'from-purple-500 to-pink-500 text-purple-500 bg-purple-50 dark:bg-purple-950/30',
    devotional: 'from-rose-500 to-orange-500 text-rose-500 bg-rose-50 dark:bg-rose-950/30',
    discipleship: 'from-green-500 to-emerald-500 text-green-500 bg-green-50 dark:bg-green-950/30',
    other: 'from-gray-500 to-slate-500 text-gray-500 bg-gray-50 dark:bg-slate-950/30',
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Recursos Espirituais">
        <LoadingState fullScreen message="Acessando arquivos da biblioteca..." />
      </Layout>
    )
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="p-4 mx-auto max-w-7xl space-y-8 animate-fade-in">
        
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-3xl group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600 transition-transform duration-700 group-hover:scale-[1.02]" />
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 p-8 md:p-12 lg:p-16 text-white">
            <div className="max-w-4xl space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur-md rounded-full border border-white/20 shadow-md">
                <BookOpen className="h-4 w-4 text-amber-300" />
                <span className="text-xs md:text-sm font-bold tracking-wider uppercase">Biblioteca Digital</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                Recursos{' '}
                <span className="bg-gradient-to-r from-yellow-200 via-amber-100 to-white bg-clip-text text-transparent">
                  Espirituais
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-indigo-50/90 font-medium max-w-2xl leading-relaxed">
                {isAdmin 
                  ? 'Painel de Gestão da Plataforma: Publique novos materiais, gerencie acervos de e-books, estudos teológicos e devocionais estruturados.'
                  : 'Explore e faça download de e-books, estudos profundos da palavra e ferramentas completas para guiar sua caminhada de fé.'}
              </p>

              {isAdmin && (
                <AdminAction>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    size="lg"
                    className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 py-6 rounded-full shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5"
                  >
                    <Plus className="mr-2 h-5 w-5 stroke-[2.5]" />
                    Adicionar Novo Recurso
                  </Button>
                </AdminAction>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Total no Acervo"
            value={resources.length}
            gradient="from-indigo-500 to-indigo-600 shadow-indigo-100 dark:shadow-none"
          />
          <StatCard
            icon={FileText}
            label="Estudos Bíblicos"
            value={resources.filter(r => r.category === 'study').length}
            gradient="from-purple-500 to-purple-600 shadow-purple-100 dark:shadow-none"
          />
          <StatCard
            icon={Heart}
            label="Devocionais"
            value={resources.filter(r => r.category === 'devotional').length}
            gradient="from-rose-500 to-rose-600 shadow-rose-100 dark:shadow-none"
          />
          <StatCard
            icon={Download}
            label="Total de Downloads"
            value={resources.reduce((sum, r) => sum + (r.downloads_count || r.downloadsCount || 0), 0)}
            gradient="from-emerald-500 to-emerald-600 shadow-emerald-100 dark:shadow-none"
          />
        </div>

        {/* Search & Filter */}
        <Card className="p-4 md:p-6 border-muted shadow-sm rounded-2xl bg-card">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquise por títulos, tags ou descrição..."
                className="pl-12 h-13 rounded-xl border-muted bg-muted/30 focus-visible:ring-primary focus-visible:ring-2 transition-all"
              />
              {searchQuery && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-13 w-full md:w-64 rounded-xl border-muted bg-muted/20 font-medium">
                  <SelectValue placeholder="Filtrar por Categoria" />
                </SelectTrigger>
                <SelectContent rounded-xl>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="ebook">📚 E-books</SelectItem>
                  <SelectItem value="study">📖 Estudos Bíblicos</SelectItem>
                  <SelectItem value="devotional">❤️ Devocionais</SelectItem>
                  <SelectItem value="discipleship">🎓 Discipulado</SelectItem>
                  <SelectItem value="other">✨ Outros Recursos</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || categoryFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="h-13 rounded-xl px-4 border-dashed hover:bg-muted"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const CategoryIcon = categoryIcons[resource.category] || BookOpen
              const styleMeta = categoryColors[resource.category] || categoryColors.other
              const [gradientClass, textAndBgClass] = styleMeta.split(' text-')

              return (
                <Card 
                  key={resource.id} 
                  className="group relative flex flex-col justify-between overflow-hidden p-6 border border-muted bg-card rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300"
                >
                  <div>
                    <div className="flex justify-between items-start mb-5">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradientClass} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      
                      {isAdmin && (
                        <AdminAction>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => deleteResource(resource.id)}
                            className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 shadow-sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-card-foreground mb-2 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                        {resource.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto pt-4 space-y-4 border-t border-muted/60">
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="px-2.5 py-0.5 bg-muted/60 text-muted-foreground text-[11px] font-semibold tracking-wide rounded-md uppercase"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground/80 bg-muted/30 px-3 py-2 rounded-xl">
                      <span className="uppercase font-bold tracking-wider">{resource.fileType || 'DOC'}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      <span>{formatFileSize(resource.fileSize || 0)}</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      <span className="font-semibold text-foreground/90">{resource.downloads_count || resource.downloadsCount || 0} downloads</span>
                    </div>

                    <Button
                      onClick={() => handleDownload(resource)}
                      className={`w-full font-bold h-11 rounded-xl bg-gradient-to-r ${gradientClass} text-white shadow-md hover:shadow-lg hover:brightness-105 transition-all`}
                    >
                      <Download className="mr-2 h-4 w-4 stroke-[2.5]" />
                      Baixar Material
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Nenhum recurso encontrado"
            description={searchQuery || categoryFilter !== 'all' ? 'Não encontramos resultados para os termos ou filtros aplicados.' : 'Novos arquivos e e-books serão anexados em breve.'}
          />
        )}

        {/* Guest Prompt */}
        {isGuest && resources.length > 0 && (
          <div className="pt-4">
            <GuestPrompt
              title="Acesso total à Biblioteca"
              description="Faça parte da nossa comunidade para baixar e salvar de forma ilimitada todos os materiais espirituais disponíveis."
              actionLabel="Criar Conta"
              onAction={() => navigate('/auth')}
            />
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-800 p-6 text-white relative">
            <div className="absolute right-4 top-4">
              <Button 
                variant="ghost" 
                onClick={() => setDialogOpen(false)} 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Shield className="h-6 w-6 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Publicar na Biblioteca</h2>
                <p className="text-xs text-indigo-200/90 font-medium uppercase tracking-wider mt-0.5">Painel de Controle do Administrador Chefe</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5 bg-card">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Título do Recurso *</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Ex: Guia Prático de Oração"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Categoria Primária *</Label>
                <Select
                  value={newResource.category}
                  onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent rounded-xl>
                    <SelectItem value="ebook">E-book</SelectItem>
                    <SelectItem value="study">Estudo Bíblico</SelectItem>
                    <SelectItem value="devotional">Devocional</SelectItem>
                    <SelectItem value="discipleship">Discipulado</SelectItem>
                    <SelectItem value="other">Outro Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Descrição Curta</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Forneça um resumo detalhado sobre o que o leitor encontrará neste arquivo..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Tags de Busca <span className="text-xs text-muted-foreground">(Separadas por vírgula)</span></Label>
              <Input
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="Ex: teologia, fe, oracao, jejum"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Anexo do Documento * <span className="text-xs text-muted-foreground">(PDF, DOCX, EPUB até 10MB)</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className="mt-1"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-4 p-4 bg-muted/60 dark:bg-muted/20 rounded-xl border border-primary/20 animate-fade-in">
                    <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{selectedFile.name}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                      className="h-8 w-8 rounded-full hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-32 transition-all gap-2 px-4 ${
                      isDragActive 
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 scale-[0.99]' 
                        : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
                    }`}
                  >
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground group-hover:text-primary transition-colors">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold">Arraste o arquivo ou clique para selecionar</div>
                    <div className="text-xs text-muted-foreground">PDF, DOCX ou EPUB de até 10MB</div>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setDialogOpen(false)}
                className="w-1/3 h-11 rounded-xl font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={uploadResource}
                disabled={uploading}
                className="w-2/3 h-11 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:brightness-105"
              >
                {uploading ? 'Salvando no Servidor...' : 'Publicar Material Agora'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default ResourcesPage
