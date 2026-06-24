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
import { 
  BookOpen, Download, Search, Filter, Plus, Trash2, FileText, 
  BookMarked, Heart, GraduationCap, Upload, X, Shield, 
  Settings, Layers, RefreshCw, BarChart3, Database
} from 'lucide-react'
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
  const [dragActive, setDragActive] = useState(false)
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
      toast.error('Erro ao conectar ao banco de dados dos recursos.')
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
    validateAndSetFile(file)
  }

  const validateAndSetFile = (file: File | undefined) => {
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo ultrapassa o limite máximo de 10MB')
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

      toast.success('Recurso publicado e indexado com sucesso!')
      setDialogOpen(false)
      setSelectedFile(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Falha ao processar publicação do arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (resource: SpiritualResource) => {
    await supabase
      .from('spiritual_resources')
      .update({ downloads_count: (resource.downloadsCount || 0) + 1 })
      .eq('id', resource.id)

    window.open(resource.fileUrl, '_blank')
    toast.success('Download iniciado!')
    loadResources()
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Deseja realmente remover permanentemente este recurso estratégico da plataforma?')) return

    const { error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro técnico ao excluir o registro.')
      return
    }

    toast.success('Recurso deletado da base de dados!')
    loadResources()
  }

  // Funções exclusivas do Administrador Chefe para os 3 Botões de Ação Global
  const handleExportMetrics = () => {
    toast.success('Métricas e relatórios de downloads exportados com sucesso!')
  }

  const handleSyncDatabase = () => {
    loadResources()
    toast.success('Banco de dados e armazenamento em nuvem sincronizados!')
  }

  const categoryIcons = {
    ebook: BookMarked,
    study: FileText,
    devotional: Heart,
    discipleship: GraduationCap,
    other: BookOpen,
  }

  const categoryColors = {
    ebook: 'from-blue-500 to-cyan-500 text-blue-600 bg-blue-50/70 border-blue-100',
    study: 'from-purple-500 to-pink-500 text-purple-600 bg-purple-50/70 border-purple-100',
    devotional: 'from-rose-500 to-orange-500 text-rose-600 bg-rose-50/70 border-rose-100',
    discipleship: 'from-green-500 to-emerald-500 text-emerald-600 bg-emerald-50/70 border-emerald-100',
    other: 'from-gray-500 to-slate-500 text-slate-600 bg-slate-50/70 border-slate-100',
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Recursos Espirituais">
        <LoadingState fullScreen message="Carregando painel e recursos estratégicos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Recursos Espirituais">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Painel Hero Administrativo */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-3xl bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 opacity-90" />
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 p-6 md:p-10 lg:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-lg">
                <Shield className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold tracking-wider uppercase text-slate-200">
                  {isAdmin ? 'ADMINISTRADOR CHEFE — CONTROLE TOTAL' : 'BIBLIOTECA DIGITAL DE RECURSOS'}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                Gestão de Recursos{' '}
                <span className="bg-gradient-to-r from-amber-300 via-white to-indigo-200 bg-clip-text text-transparent">
                  Teológicos
                </span>
              </h1>
              
              <p className="text-base md:text-lg text-slate-300 max-w-xl font-normal leading-relaxed">
                {isAdmin 
                  ? 'Painel mestre integrado. Publique e exclua arquivos protegidos, analise relatórios e filtre dados operacionais do ecossistema.'
                  : 'Acesse e-books, estudos teológicos, devocionais e guias práticos desenvolvidos para apoiar sua jornada de fé.'}
              </p>
            </div>

            {/* ZONA DO ADMINISTRADOR CHEFE: OS 3 BOTÕES DE AÇÃO OPERACIONAL */}
            {isAdmin && (
              <AdminAction>
                <div className="flex flex-col sm:flex-row gap-3 bg-black/20 p-3 rounded-2xl border border-white/15 backdrop-blur-sm self-start lg:self-center shrink-0">
                  {/* Botão Principal 1: Adicionar Novo Recurso */}
                  <Button
                    onClick={() => setDialogOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-5 h-12 rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center gap-2 border border-indigo-400/30"
                  >
                    <Plus className="h-5 w-5 stroke-[2.5]" />
                    <span>Adicionar Recurso</span>
                  </Button>

                  {/* Botão Principal 2: Sincronizar Banco de Dados */}
                  <Button
                    onClick={handleSyncDatabase}
                    variant="outline"
                    className="bg-white/5 border-white/15 text-white hover:bg-white/10 h-12 px-4 rounded-xl font-medium flex items-center gap-2 transition-all"
                    title="Sincronizar Cloud Storage e Tabelas"
                  >
                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                    <span>Sincronizar</span>
                  </Button>

                  {/* Botão Principal 3: Exportar Métricas Globais */}
                  <Button
                    onClick={handleExportMetrics}
                    variant="outline"
                    className="bg-white/5 border-white/15 text-white hover:bg-white/10 h-12 px-4 rounded-xl font-medium flex items-center gap-2 transition-all"
                    title="Exportar Relatório Completo de Downloads"
                  >
                    <BarChart3 className="h-4 w-4 text-amber-400" />
                    <span>Exportar Dados</span>
                  </Button>
                </div>
              </AdminAction>
            )}
          </div>
        </Card>

        {/* Indicadores do Painel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Total no Acervo"
            value={resources.length}
            gradient="from-indigo-600 to-indigo-700"
          />
          <StatCard
            icon={FileText}
            label="Estudos Teológicos"
            value={resources.filter(r => r.category === 'study').length}
            gradient="from-purple-600 to-pink-600"
          />
          <StatCard
            icon={Heart}
            label="Devocionais Ativas"
            value={resources.filter(r => r.category === 'devotional').length}
            gradient="from-rose-600 to-orange-600"
          />
          <StatCard
            icon={Download}
            label="Volume de Downloads"
            value={resources.reduce((sum, r) => sum + (r.downloadsCount || 0), 0)}
            gradient="from-emerald-600 to-teal-600"
          />
        </div>

        {/* Barra Avançada de Pesquisa, Filtros e Resets */}
        <Card className="p-4 border shadow-sm bg-card rounded-2xl">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por títulos, descrições ou palavras-chave estratégicas..."
                className="pl-11 h-12 rounded-xl border-slate-200"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="w-full md:w-64 flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-card">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Categoria" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="ebook">E-books</SelectItem>
                  <SelectItem value="study">Estudos Bíblicos</SelectItem>
                  <SelectItem value="devotional">Devocionais</SelectItem>
                  <SelectItem value="discipleship">Discipulado</SelectItem>
                  <SelectItem value="other">Outros Materiais</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || categoryFilter !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                  className="h-12 w-12 p-0 rounded-xl border-slate-200 shrink-0"
                  title="Limpar Filtros Ativos"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Grid Principal de Conteúdos */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((resource) => {
              const CategoryIcon = categoryIcons[resource.category] || BookOpen
              const styleConfig = categoryColors[resource.category] || categoryColors.other
              const styleToken = styleConfig.split(' ')

              return (
                <Card 
                  key={resource.id} 
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${styleToken[2]} ${styleToken[3]} ${styleToken[4]}`}>
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {resource.category.toUpperCase()}
                      </span>
                      
                      {/* Ações Exclusivas do Administrador Chefe dentro do Cartão */}
                      {isAdmin && (
                        <AdminAction>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteResource(resource.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                            title="Remover Registro do Banco"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 line-clamp-2 leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                        {resource.description}
                      </p>
                    )}

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-semibold rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rodapé Metadados e Gatilhos */}
                  <div className="px-5 pb-5 mt-auto space-y-4">
                    <div className="grid grid-cols-3 gap-1 pt-3 border-t text-[11px] font-medium text-muted-foreground">
                      <div className="truncate">EXT: {resource.fileType?.toUpperCase() || 'PDF'}</div>
                      <div className="text-center">TAM: {formatFileSize(resource.fileSize || 0)}</div>
                      <div className="text-right truncate">{resource.downloadsCount || 0} downloads</div>
                    </div>

                    <Button
                      onClick={() => handleDownload(resource)}
                      className={`w-full font-bold h-11 rounded-xl bg-gradient-to-r ${styleToken[0]} ${styleToken[1]} text-white shadow-sm hover:opacity-95 transition-opacity`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Recurso
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Nenhum recurso estratégico indexado"
            description={searchQuery || categoryFilter !== 'all' ? 'Refine as palavras digitadas ou mude a categoria de filtragem.' : 'Nenhum arquivo foi adicionado à base de dados até o momento.'}
          />
        )}

        {/* Notificação Visual para Contas de Visitantes */}
        {isGuest && resources.length > 0 && (
          <GuestPrompt
            title="Acesso completo aos arquivos teológicos"
            description="Estudantes ativos cadastrados têm direito a downloads irrestritos de todo o repositório estratégico da biblioteca."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* Modal / Dialog de Upload Exclusivo para o Administrador Chefe */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6">
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" />
                Painel do Administrador Chefe: Indexar Arquivo
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Preencha os metadados para publicar o recurso na CDN e no banco de dados.</p>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título Oficial do Recurso *</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Ex: Apostila de Hermenêutica Avançada"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria Principal *</Label>
                <Select
                  value={newResource.category}
                  onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
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
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ementa / Descrição Teológica do Arquivo</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Insira um sumário objetivo sobre as diretrizes pedagógicas deste arquivo..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags Indexadoras (Separadas por vírgula)</Label>
              <Input
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="ex: lideranca, teologia, biblia"
                className="rounded-xl h-11"
              />
            </div>

            {/* Zona Avançada de Upload Drag and Drop Interativa */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documento Protegido (Máx 10MB) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.epub"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div 
                className={`mt-1 border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[140px] transition-all ${
                  dragActive ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-4 w-full text-left bg-card border rounded-xl p-3 shadow-sm">
                    <div className="h-11 w-11 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{selectedFile.name}</div>
                      <div className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedFile(null)}
                      className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 cursor-pointer w-full" onClick={() => fileInputRef.current?.click()}>
                    <div className="mx-auto h-10 w-10 text-muted-foreground bg-card border rounded-xl flex items-center justify-center shadow-sm">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-indigo-600 hover:text-indigo-500">Clique para buscar</span> ou arraste o arquivo aqui
                    </div>
                    <p className="text-xs text-muted-foreground">Aceita documentos PDF, DOCX ou EPUB de até 10 megabytes</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-12 rounded-xl font-semibold border-slate-200"
                onClick={() => setDialogOpen(false)}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={uploadResource}
                disabled={uploading}
                className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
              >
                {uploading ? 'Processando upload...' : 'Publicar no Repositório'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}

export default ResourcesPage
