import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { BookOpen, Download, Search, Filter, Plus, Trash2, FileText, BookMarked, Heart, GraduationCap, Upload, X, Shield } from 'lucide-react'
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
    const { data, error } = await supabase
      .from('spiritual_resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading resources:', error)
      setLoading(false)
      return
    }

    setResources(data as any)
    setLoading(false)
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 10MB')
      return
    }

    setSelectedFile(file)
  }

  const uploadResource = async () => {
    if (!selectedFile || !newResource.title.trim()) {
      toast.error('Preencha título e selecione um arquivo')
      return
    }

    setUploading(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('spiritual-resources')
        .upload(filePath, selectedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('spiritual-resources')
        .getPublicUrl(filePath)

      // Create resource record
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
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    // Increment download count
    await supabase
      .from('spiritual_resources')
      .update({ downloads_count: resource.downloadsCount + 1 })
      .eq('id', resource.id)

    // Open file in new tab
    window.open(resource.fileUrl, '_blank')
    toast.success('Download iniciado!')
    loadResources()
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return

    const { error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao excluir recurso')
      return
    }

    toast.success('Recurso excluído!')
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
    ebook: 'from-blue-500 to-cyan-500',
    study: 'from-purple-500 to-pink-500',
    devotional: 'from-rose-500 to-orange-500',
    discipleship: 'from-green-500 to-emerald-500',
    other: 'from-gray-500 to-slate-500',
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Recursos Espirituais">
        <LoadingState fullScreen message="Carregando recursos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="p-3 space-y-6">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/96 via-purple-700/94 to-pink-700/92" />
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <BookOpen className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">BIBLIOTECA DIGITAL</span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                Recursos{' '}
                <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                  Espirituais
                </span>
              </h1>
              
              <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                {isAdmin 
                  ? 'Gerencie e-books, estudos bíblicos, devocionais e materiais de discipulado'
                  : 'E-books, estudos bíblicos, devocionais e materiais de discipulado para sua jornada de fé'}
              </p>

              {isAdmin && (
                <AdminAction>
                  <Button
                    onClick={() => setDialogOpen(true)}
                    size="lg"
                    className="bg-white text-indigo-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Adicionar Recurso
                  </Button>
                </AdminAction>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          <StatCard
            icon={BookOpen}
            label="Total"
            value={resources.length}
            gradient="from-indigo-500 to-purple-500"
          />
          <StatCard
            icon={FileText}
            label="Estudos"
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
            label="Downloads"
            value={resources.reduce((sum, r) => sum + r.downloadsCount, 0)}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        {/* Search & Filter */}
        <Card className="p-4 md:p-6 border-2">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar recursos..."
                  className="pl-10 h-12"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="ebook">E-books</SelectItem>
                  <SelectItem value="study">Estudos Bíblicos</SelectItem>
                  <SelectItem value="devotional">Devocionais</SelectItem>
                  <SelectItem value="discipleship">Discipulado</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Resources Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredResources.map((resource) => {
              const CategoryIcon = categoryIcons[resource.category]
              const gradient = categoryColors[resource.category]

              return (
                <Card key={resource.id} className="group p-5 md:p-6 border-2 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 transform">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                      <CategoryIcon className="h-6 w-6 text-white" />
                    </div>
                    {isAdmin && (
                      <AdminAction>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteResource(resource.id)}
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AdminAction>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {resource.title}
                  </h3>

                  {resource.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {resource.description}
                    </p>
                  )}

                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {resource.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-muted text-xs font-medium rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{resource.fileType?.toUpperCase()}</span>
                    <span>{formatFileSize(resource.fileSize || 0)}</span>
                    <span>{resource.downloadsCount} downloads</span>
                  </div>

                  <Button
                    onClick={() => handleDownload(resource)}
                    className={`w-full font-semibold bg-gradient-to-r ${gradient} text-white`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar
                  </Button>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Nenhum recurso encontrado"
            description={searchQuery || categoryFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Novos recursos serão adicionados em breve'}
          />
        )}

        {/* Guest Prompt */}
        {isGuest && resources.length > 0 && (
          <GuestPrompt
            title="Acesso total aos recursos"
            description="Membros têm acesso ilimitado para download de todos os materiais espirituais disponíveis."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Adicionar Recurso Espiritual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                placeholder="Nome do recurso"
              />
            </div>

            <div>
              <Label>Categoria *</Label>
              <Select
                value={newResource.category}
                onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="study">Estudo Bíblico</SelectItem>
                  <SelectItem value="devotional">Devocional</SelectItem>
                  <SelectItem value="discipleship">Discipulado</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Breve descrição do conteúdo"
                rows={3}
              />
            </div>

            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="fé, oração, bíblia"
              />
            </div>

            <div>
              <Label>Arquivo (PDF, DOCX, EPUB - máx 10MB) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="mt-2">
                {selectedFile ? (
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border-2 border-primary/30">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{selectedFile.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed h-24"
                  >
                    <Upload className="mr-2 h-5 w-5" />
                    Selecionar Arquivo
                  </Button>
                )}
              </div>
            </div>

            <Button
              onClick={uploadResource}
              disabled={uploading}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
            >
              {uploading ? 'Fazendo upload...' : 'Publicar Recurso'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default ResourcesPage
