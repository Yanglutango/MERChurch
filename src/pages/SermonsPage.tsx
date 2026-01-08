import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Play, Search, Eye, BookOpen, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Sermon } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { SermonEditor } from '../components/admin/SermonEditor'

const SermonsPage = () => {
  const { user } = useAuth()
  const [sermons, setSermons] = useState<Sermon[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSermon, setEditingSermon] = useState<Sermon | null>(null)

  useEffect(() => {
    loadSermons()
  }, [])

  const loadSermons = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sermons')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error loading sermons:', error)
      setLoading(false)
      return
    }

    setSermons(data)
    setLoading(false)
  }

  const handleEditorSuccess = () => {
    loadSermons()
    setEditingSermon(null)
  }

  const handleEdit = (sermon: Sermon) => {
    setEditingSermon(sermon)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este sermão?')) return

    const { error } = await supabase.from('sermons').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir sermão')
      return
    }

    toast.success('Sermão excluído com sucesso!')
    loadSermons()
  }

  const filteredSermons = sermons.filter((sermon) => {
    const matchesSearch = sermon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sermon.speaker.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || sermon.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(sermons.map((s) => s.category).filter(Boolean)))]

  if (loading) {
    return (
      <Layout title="Sermões">
        <LoadingState fullScreen message="Carregando sermões..." />
      </Layout>
    )
  }

  return (
    <Layout title="Sermões">
      <div className="space-y-6">
        <PageHeader
          title="Sermões"
          description="Assista e reviva momentos poderosos da Palavra"
          icon={BookOpen}
          gradient="from-blue-500 via-cyan-500 to-teal-500"
          actions={
            <AdminAction>
              <Button onClick={() => { setEditingSermon(null); setEditorOpen(true); }} className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Sermão
              </Button>
            </AdminAction>
          }
        />
        
        {/* Search & Filter */}
        <Card className="p-6 border-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar sermões..."
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                  className="capitalize"
                  size="sm"
                >
                  {cat === 'all' ? 'Todos' : cat}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Featured Sermon */}
        {filteredSermons.length > 0 && (
          <Card className="relative overflow-hidden border-2">
            <div className="absolute inset-0">
              <img
                src={filteredSermons[0].thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&h=600&fit=crop'}
                alt={filteredSermons[0].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-transparent" />
            </div>

            <div className="relative z-10 p-8 md:p-12 text-white max-w-2xl">
              <div className="inline-block px-3 py-1 bg-primary rounded-full text-sm font-semibold mb-4">
                Mais Recente
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">{filteredSermons[0].title}</h2>
              <p className="text-lg text-white/90 mb-2">{filteredSermons[0].speaker}</p>
              <p className="text-white/70 mb-6">
                {new Date(filteredSermons[0].date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <div className="flex gap-3">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">
                  <Play className="mr-2 h-5 w-5" />
                  Assistir Agora
                </Button>
                <AdminAction>
                  <Button size="lg" variant="outline" onClick={() => handleEdit(filteredSermons[0])} className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </AdminAction>
              </div>
            </div>
          </Card>
        )}

        {/* Sermons Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSermons.slice(1).map((sermon) => (
            <Card key={sermon.id} className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl">
              <div className="relative h-48 overflow-hidden bg-muted">
                <img
                  src={sermon.thumbnailUrl || 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600&h=400&fit=crop'}
                  alt={sermon.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center cursor-pointer">
                  <div className="p-4 bg-white/20 backdrop-blur-sm rounded-full group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs text-white flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {sermon.views}
                </div>
                <AdminAction>
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={() => handleEdit(sermon)} className="h-8 w-8 p-0">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(sermon.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AdminAction>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                  {sermon.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">{sermon.speaker}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(sermon.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {filteredSermons.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Nenhum sermão encontrado"
            description="Tente ajustar os filtros de busca"
          />
        )}
      </div>

      <SermonEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        sermon={editingSermon}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default SermonsPage
