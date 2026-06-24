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
import { BookOpen, Download, Search, Plus, Trash2, FileText, BookMarked, Heart, GraduationCap, Upload, X, Loader2 } from 'lucide-react'
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
    } catch (error: any) {
      console.error('Error loading resources:', error)
      toast.error('Erro ao carregar repositório de recursos')
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

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return

    // Max 10MB validation
    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB')
      return
    }

    setSelectedFile(file)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    validateAndSetFile(file)
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
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const uploadResource = async () => {
    if (!selectedFile || !newResource.title.trim()) {
      toast.error('Por favor, preencha o título e selecione um arquivo válido')
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

      toast.success('Recurso publicado com sucesso!')
      setDialogOpen(false)
      setSelectedFile(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erro ao fazer upload do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    try {
      const currentCount = resource.downloads_count || resource.downloadsCount || 0
      
      await supabase
        .from('spiritual_resources')
        .update({ downloads_count: currentCount + 1 })
        .eq('id', resource.id)

      window.open(resource.fileUrl || (resource as any).file_url, '_blank')
      toast.success('Download iniciado!')
      
      // Local state update prevents unnecessary loading spinners across the screen
      setResources(prev => prev.map(item => 
        item.id === resource.id 
          ? { ...item, downloads_count: currentCount + 1, downloadsCount: currentCount + 1 } 
          : item
      ))
    } catch (err) {
      console.error(err)
    }
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir permanentemente este recurso?')) return

    const { error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao excluir recurso')
      return
    }

    toast.success('Recurso removido com sucesso!')
    loadResources()
  }

  const categoryIcons = {
    ebook: BookMarked,
    study: FileText,
    devotional: Heart,
    discipleship: GraduationCap,
    other: BookOpen,
  }

  const categoryColors = {
    ebook: 'from-blue-500 to-cyan-500 text-blue-500',
    study: 'from-purple-500 to-pink-500 text-purple-500',
    devotional: 'from-rose-500 to-orange-500 text-rose-500',
    discipleship: 'from-green-500 to-emerald-500 text-green-500',
    other: 'from-gray-500 to-slate-500 text-gray-500',
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Recursos Espirituais">
        <LoadingState fullScreen message="Carregando biblioteca de recursos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="container mx-auto p-4 max-w-7xl space-y-8 animate-fade-in">
        
        {/* Banner Hero */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 opacity-95" />
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 p-6 sm:p-10 md:p-14 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 backdrop-blur-md rounded-full border border-white/20">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-50">Biblioteca de Edificação</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none">
                Recursos{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-100">
                  Espirituais
                </span>
              </h1>
              
              <p className="text-base sm:text-lg text-indigo-100/90 font-medium max-w-xl">
                {isAdmin 
                  ? 'Painel Administrativo: Publique e gerencie e-books, estudos bíblicos, roteiros de devocionais e ferramentas de discipulado.'
                  : 'Explore e baixe e-books, estudos bíblicos estruturados e devocionais práticos organizados para impulsionar sua caminhada cristã.'}
              </p>
            </div>

            {isAdmin && (
              <AdminAction>
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 active:scale-95 font-bold px-6 py-6 rounded-2xl shadow-lg transition-all shrink-0 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                  Adicionar Material
                </Button>
              </AdminAction>
            )}
          </div>
        </Card>

        {/* Painel de Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Total Acervo"
            value={resources.length}
            gradient="from-indigo-500 to-blue-600"
          />
          <StatCard
            icon={FileText}
            label="Estudos Disponíveis"
            value={resources.filter(r => r.category === 'study').length}
            gradient="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={Heart}
            label="Devocionais"
            value={resources.filter(r => r.category === 'devotional').length}
            gradient="from-rose-500 to-orange-500"
          />
          <StatCard
            icon={Download}
            label="Total de Downloads"
            value={resources.reduce((sum, r) => sum + (r.downloads_count || r.downloadsCount || 0), 0)}
            gradient="from-emerald-500 to-teal-600"
          />
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-2 rounded-2xl border shadow-sm">
          <div className="relative w-full flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, descrição ou tags..."
              className="pl-10 pr-10 h-12 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="w-full sm:w-64">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-12 border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Filtrar Categoria" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl">
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="ebook">📚 E-books</SelectItem>
                <SelectItem value="study">📝 Estudos Bíblicos</SelectItem>
                <SelectItem value="devotional">❤️ Devocionais</SelectItem>
                <SelectItem value="discipleship">🎓 Discipulado / Formação</SelectItem>
                <SelectItem value="other">📂 Outros Materiais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de Cards de Recursos */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => {
              const CategoryIcon = categoryIcons[resource.category] || BookOpen
              const colorClasses = categoryColors[resource.category] || 'from-gray-500 to-slate-500 text-gray-500'
              const gradientBg = colorClasses.split(' ')[0] + ' ' + colorClasses.split(' ')[1]

              return (
                <Card 
                  key={resource.id} 
                  className="group relative flex flex-col justify-between overflow-hidden border bg-card hover:bg-card/50 transition-all duration-3xl hover:shadow-xl hover:-translate-y-1.5 rounded-2xl"
                >
                  <div className="p-6 space-y-4 flex-1">
                    <div className="flex justify-between items-start">
                      <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${gradientBg} shadow-md group-hover:scale-105 transition-transform duration-3xl`}>
                        <CategoryIcon className="h-5 w-5 text-white" />
                      </div>
                      
                      {isAdmin && (
                        <AdminAction>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteResource(resource.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all opacity-80 sm:opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-foreground line-clamp-2 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {resource.title}
                      </h3>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                          {resource.description}
                        </p>
                      )}
                    </div>

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs font-medium rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rodapé Interno do Card */}
                  <div className="px-6 pb-6 pt-2 border-t bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span className="uppercase px-1.5 py-0.5 bg-muted rounded border text-[10px] tracking-wider font-bold">
                        {resource.fileType || resource.file_type || 'DOC'}
                      </span>
                      <span>•</span>
                      <span>{formatFileSize(resource.fileSize || (resource as any).file_size || 0)}</span>
                      <span>•</span>
                      <span className="text-foreground/80">
                        {resource.downloads_count || resource.downloadsCount || 0} downloads
                      </span>
                    </div>

                    <Button
                      onClick={() => handleDownload(resource)}
                      className={`w-full font-bold shadow-md bg-gradient-to-r ${gradientBg} text-white hover:opacity-95 active:scale-[0.99] transition-all rounded-xl h-11`}
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
            title="Nenhum recurso localizado"
            description={searchQuery || categoryFilter !== 'all' ? 'Tente flexibilizar termos ou alterar a categoria escolhida nos filtros.' : 'Novos e-books e apostilas estão sendo preparados para a biblioteca.'}
          />
        )}

        {/* Prompt de Visitantes */}
        {isGuest && resources.length > 0 && (
          <GuestPrompt
            title="Acesso ilimitado liberado!"
            description="Crie uma conta comunitária de membro para destravar downloads sem restrições e acompanhar seu histórico de leitura."
            actionLabel="Criar Conta Gratuita"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* Modal / Dialog de Upload do Admin */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <DialogTitle className="text-xl font-bold">Publicar Novo Recurso</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          
          <div className="space-y-5 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="font-semibold text-sm">Título do Material *</Label>
              <Input
                id="title"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="Ex: Guia de Oração e Intercessão Prática"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="font-semibold text-sm">Categoria Primária *</Label>
              <Select
                value={newResource.category}
                onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
              >
                <SelectTrigger id="category" className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ebook">📚 E-book Completo</SelectItem>
                  <SelectItem value="study">📝 Estudo Bíblico / Esboço</SelectItem>
                  <SelectItem value="devotional">❤️ Devocional Diário</SelectItem>
                  <SelectItem value="discipleship">🎓 Manual de Discipulado</SelectItem>
                  <SelectItem value="other"> Outros Formatos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="font-semibold text-sm">Sinopse ou Descrição</Label>
              <Textarea
                id="description"
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Insira um breve resumo contextualizando o material bíblico..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tags" className="font-semibold text-sm">Palavras-chave (Separadas por vírgula)</Label>
              <Input
                id="tags"
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="Ex: paternidade, jejum, evangelismo"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Drag & Drop Upload Container */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">Arquivo Anexo *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div 
                className={`mt-1 border-2 border-dashed rounded-xl transition-all ${
                  selectedFile 
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10' 
                    : isDragActive 
                    ? 'border-indigo-500 bg-indigo-50/40' 
                    : 'border-muted-foreground/20 bg-muted/10 hover:bg-muted/30'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-4 p-4">
                    <div className="p-2.5 bg-emerald-500 text-white rounded-xl">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-semibold text-sm truncate">{selectedFile.name}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                      className="h-8 w-8 p-0 rounded-full hover:bg-emerald-100"
                    >
                      <X className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 flex flex-col items-center justify-center gap-2 px-4 text-muted-foreground focus:outline-none"
                  >
                    <Upload className={`h-6 w-6 transition-transform ${isDragActive ? 'translate-y-[-4px] text-indigo-500' : ''}`} />
                    <span className="text-sm font-medium">
                      Arrastar e soltar arquivo ou <span className="text-indigo-600 font-semibold underline">navegar</span>
                    </span>
                    <span className="text-xs text-muted-foreground/80">PDF, DOCX ou EPUB até 10MB</span>
                  </button>
                )}
              </div>
            </div>

            <Button
              onClick={uploadResource}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white h-11 font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all mt-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando no Servidor...
                </>
              ) : (
                'Publicar Recurso na Biblioteca'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default ResourcesPage;
