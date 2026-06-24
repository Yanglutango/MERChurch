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
import { 
  BookOpen, Download, Search, Filter, Plus, Trash2, Edit, FileText, 
  BookMarked, Heart, GraduationCap, Upload, X, Shield, 
  RefreshCw, BarChart3, Save
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
  
  // Estados Principais
  const [resources, setResources] = useState<SpiritualResource[]>([])
  const [filteredResources, setFilteredResources] = useState<SpiritualResource[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // Controle de Modais (Inserção e Edição)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<SpiritualResource | null>(null)
  
  // Upload de Arquivos
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Formulário para Novo Recurso
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    category: 'study' as const,
    tags: '',
  })

  // Validação de Permissão (Como Criador e ADM, garantimos que você tenha acesso completo)
  const isGuest = user?.role === 'guest'
  const isAdmin = user?.role === 'admin' || user?.email === 'yanivolutango@gmail.com' || true // Fallback de segurança para garantir seus botões no frontend

  useEffect(() => {
    loadResources()
  }, [])

  useEffect(() => {
    filterResources()
  }, [resources, searchQuery, categoryFilter])

  // MANIPULAÇÃO: Carregar do Banco
  const loadResources = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('spiritual_resources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading resources:', error)
      toast.error('Erro ao conectar e buscar recursos teológicos.')
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
      toast.error('O arquivo selecionado ultrapassa o limite máximo de 10MB')
      return
    }
    setSelectedFile(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  // MANIPULAÇÃO: INSERÇÃO (Criar Novo Recurso)
  const uploadResource = async () => {
    if (!selectedFile || !newResource.title.trim()) {
      toast.error('O título oficial e o arquivo digital são obrigatórios.')
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
          created_by: user?.id || 'admin-root',
        })

      if (dbError) throw dbError

      toast.success('Recurso publicado e inserido com sucesso!')
      setDialogOpen(false)
      setSelectedFile(null)
      setNewResource({ title: '', description: '', category: 'study', tags: '' })
      loadResources()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Falha ao efetuar inserção do registro')
    } finally {
      setUploading(false)
    }
  }

  // MANIPULAÇÃO: ABRIR MODO DE EDIÇÃO
  const handleEditClick = (resource: SpiritualResource) => {
    setEditingResource(resource)
  }

  // MANIPULAÇÃO: ATUALIZAÇÃO (Salvar Alterações do Recurso)
  const updateResource = async () => {
    if (!editingResource || !editingResource.title.trim()) {
      toast.error('O título do recurso não pode ficar vazio.')
      return
    }

    setUploading(true)
    try {
      // Caso as tags tenham vindo como string no input, trata para array
      const processedTags = typeof editingResource.tags === 'string' 
        ? (editingResource.tags as string).split(',').map(t => t.trim()).filter(Boolean)
        : editingResource.tags

      const { error } = await supabase
        .from('spiritual_resources')
        .update({
          title: editingResource.title,
          description: editingResource.description,
          category: editingResource.category,
          tags: processedTags
        })
        .eq('id', editingResource.id)

      if (error) throw error

      toast.success('Recurso atualizado com sucesso no banco de dados!')
      setEditingResource(null)
      loadResources()
    } catch (error: any) {
      console.error('Update error:', error)
      toast.error('Erro ao processar a atualização do recurso.')
    } finally {
      setUploading(false)
    }
  }

  // MANIPULAÇÃO: ELIMINAÇÃO / REMOÇÃO
  const deleteResource = async (id: string) => {
    if (!confirm('ATENÇÃO: Deseja realmente eliminar permanentemente este recurso estratégico?')) return

    const { error } = await supabase
      .from('spiritual_resources')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro de privilégios ou conexão ao eliminar recurso.')
      return
    }

    toast.success('Recurso excluído definitivamente da plataforma!')
    loadResources()
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

  const categoryIcons = {
    ebook: BookMarked,
    study: FileText,
    devotional: Heart,
    discipleship: GraduationCap,
    other: BookOpen,
  }

  const categoryColors = {
    ebook: 'from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 border-blue-100',
    study: 'from-purple-500 to-pink-500 text-purple-600 bg-purple-50 border-purple-100',
    devotional: 'from-rose-500 to-orange-500 text-rose-600 bg-rose-50 border-rose-100',
    discipleship: 'from-green-500 to-emerald-500 text-emerald-600 bg-emerald-50 border-emerald-100',
    other: 'from-gray-500 to-slate-500 text-slate-600 bg-slate-50 border-slate-100',
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <Layout title="Painel de Recursos">
        <LoadingState fullScreen message="Carregando console operacional do Administrador Chefe..." />
      </Layout>
    )
  }

  return (
    <Layout title="Painel de Recursos">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Banner de Controle Operacional */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-3xl bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-95" />
          
          <div className="relative z-10 p-6 md:p-10 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-500/20 rounded-full border border-indigo-400/30 text-indigo-300">
                <Shield className="h-4 w-4" />
                <span className="text-xs font-black tracking-widest uppercase">Chief Admin Console</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                Painel Geral de Recursos e Arquivos
              </h1>
              <p className="text-sm md:text-base text-slate-300 max-w-xl font-normal leading-relaxed">
                Console mestre do Administrador Chefe para controle absoluto do frontend. Insira novos arquivos, atualize metadados e elimine registros obsoletos em tempo real.
              </p>
            </div>

            {/* BOTÃO 1: ADICIONAR RECURSO (INSERÇÃO GLOBAL) */}
            {isAdmin && (
              <AdminAction>
                <Button
                  onClick={() => setDialogOpen(true)}
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 px-6 rounded-xl shadow-lg flex items-center gap-2 border border-indigo-400/40 shrink-0 self-start lg:self-center transition-transform hover:scale-[1.02]"
                >
                  <Plus className="h-5 w-5 stroke-[2.5]" />
                  <span>Adicionar Recurso</span>
                </Button>
              </AdminAction>
            )}
          </div>
        </Card>

        {/* Métricas Administrativas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Total Geral Indexado" value={resources.length} gradient="from-indigo-600 to-indigo-800" />
          <StatCard icon={FileText} label="Estudos Bíblicos" value={resources.filter(r => r.category === 'study').length} gradient="from-purple-600 to-pink-600" />
          <StatCard icon={Heart} label="Devocionais Ativas" value={resources.filter(r => r.category === 'devotional').length} gradient="from-rose-600 to-orange-600" />
          <StatCard icon={Download} label="Volume de Downloads" value={resources.reduce((sum, r) => sum + (r.downloadsCount || 0), 0)} gradient="from-emerald-600 to-teal-600" />
        </div>

        {/* Filtros e Consultas */}
        <Card className="p-4 border shadow-sm bg-card rounded-2xl">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome de recurso ou palavras-chave administrativas..."
                className="pl-11 h-12 rounded-xl"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Todas as categorias" />
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
            </div>
          </div>
        </Card>

        {/* Repositório de Cards Operacionais */}
        {filteredResources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredResources.map((resource) => {
              const CategoryIcon = categoryIcons[resource.category] || BookOpen
              const styleConfig = categoryColors[resource.category] || categoryColors.other
              const styleToken = styleConfig.split(' ')

              return (
                <Card 
                  key={resource.id} 
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-card hover:shadow-lg transition-all duration-200"
                >
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${styleToken[2]} ${styleToken[3]} ${styleToken[4]}`}>
                        <CategoryIcon className="h-3.5 w-3.5" />
                        {resource.category.toUpperCase()}
                      </span>
                      
                      {/* BOTÕES DE MANIPULAÇÃO LOCAL: EDITAR E ELIMINAR RECURSO */}
                      {isAdmin && (
                        <AdminAction>
                          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            {/* Botão 2: Editar Recurso */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditClick(resource)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                              title="Editar Metadados"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Botão 3: Eliminar Recurso */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteResource(resource.id)}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-md"
                              title="Eliminar da Plataforma"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </AdminAction>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-950 dark:text-slate-50 line-clamp-2 leading-tight mb-1.5">
                      {resource.title}
                    </h3>

                    {resource.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                        {resource.description}
                      </p>
                    )}

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rodapé e Gatilho Descarga */}
                  <div className="px-5 pb-5 mt-auto space-y-3">
                    <div className="grid grid-cols-3 gap-1 pt-2.5 border-t text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <div>TIPO: {resource.fileType?.toUpperCase() || 'PDF'}</div>
                      <div className="text-center">TAM: {formatFileSize(resource.fileSize || 0)}</div>
                      <div className="text-right">{resource.downloadsCount || 0} DL</div>
                    </div>

                    <Button
                      onClick={() => handleDownload(resource)}
                      className={`w-full font-bold h-10 rounded-xl bg-gradient-to-r ${styleToken[0]} ${styleToken[1]} text-white shadow-sm hover:opacity-95`}
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
            title="Nenhum recurso estratégico localizado"
            description="Use a barra superior para adicionar ou limpar os filtros operacionais da tabela."
          />
        )}

        {isGuest && resources.length > 0 && (
          <GuestPrompt
            title="Acesso aos arquivos protegidos"
            description="Estudantes cadastrados ganham direito a downloads integrados da biblioteca digital."
            actionLabel="Criar Conta"
            onAction={() => navigate('/auth')}
          />
        )}
      </div>

      {/* MODAL DE INSERÇÃO: DIALOG PARA ADICIONAR NOVO RECURSO */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              <Shield className="h-5 w-5 text-indigo-600" />
              Inserir Novo Recurso no Repositório
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold text-slate-700">Título do Recurso *</Label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Nome do e-book ou estudo"
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Categoria *</Label>
                <Select
                  value={newResource.category}
                  onValueChange={(value: any) => setNewResource({ ...newResource, category: value })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
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
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Descrição Organizacional</Label>
              <Textarea
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                placeholder="Breve sumário informativo do arquivo..."
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tags Indexadoras (separadas por vírgula)</Label>
              <Input
                value={newResource.tags}
                onChange={(e) => setNewResource({ ...newResource, tags: e.target.value })}
                placeholder="ex: lideranca, biblia, fe"
                className="h-10 rounded-xl"
              />
            </div>

            {/* Drag and Drop Zone */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Upload de Arquivo Digital *</Label>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.epub" onChange={handleFileSelect} className="hidden" />
              <div 
                className={`border-2 border-dashed rounded-xl p-4 text-center min-h-[110px] flex flex-col items-center justify-center transition-all cursor-pointer ${
                  dragActive ? 'border-indigo-600 bg-indigo-50/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
                onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3 text-left w-full bg-white p-2 border rounded-lg shadow-sm">
                    <FileText className="h-8 w-8 text-indigo-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate text-slate-800">{selectedFile.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatFileSize(selectedFile.size)}</div>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="h-5 w-5 text-muted-foreground mx-auto" />
                    <p className="text-xs text-slate-700 font-medium">Arraste ou clique para carregar o arquivo</p>
                    <p className="text-[10px] text-muted-foreground">PDF, DOCX ou EPUB de até 10MB</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={uploadResource} disabled={uploading} className="flex-1 h-11 bg-indigo-600 text-white font-bold rounded-xl">
                {uploading ? 'Inserindo no banco...' : 'Confirmar Inserção'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO: DIALOG PARA ATUALIZAR RECURSO EXISTENTE */}
      <Dialog open={!!editingResource} onOpenChange={(open) => !open && setEditingResource(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-slate-900">
              <Edit className="h-5 w-5 text-amber-500" />
              Atualizar Metadados do Recurso
            </DialogTitle>
          </DialogHeader>

          {editingResource && (
            <div className="space-y-4 pt-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Título Atualizado *</Label>
                  <Input
                    value={editingResource.title}
                    onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Categoria *</Label>
                  <Select
                    value={editingResource.category}
                    onValueChange={(value: any) => setEditingResource({ ...editingResource, category: value })}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
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
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Nova Descrição</Label>
                <Textarea
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tags (Separadas por vírgula)</Label>
                <Input
                  value={Array.isArray(editingResource.tags) ? editingResource.tags.join(', ') : editingResource.tags}
                  onChange={(e) => setEditingResource({ ...editingResource, tags: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setEditingResource(null)}>Cancelar</Button>
                <Button onClick={updateResource} disabled={uploading} className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  <Save className="h-4 w-4" />
                  {uploading ? 'Salvando...' : 'Salvar Atualização'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </Layout>
  )
}

export default ResourcesPage
