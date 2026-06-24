import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { 
  GraduationCap, 
  Play, 
  BookOpen, 
  Clock, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  UserPlus, 
  CheckCircle2, 
  BarChart3, 
  Search, 
  RefreshCw, 
  X, 
  ChevronRight,
  TrendingDown
} from 'lucide-react'
import { toast } from 'sonner'
import type { Course, Enrollment, CourseProgress } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { CourseEditor } from '../components/admin/CourseEditor'

const ACADEMY_MESSAGES = {
  DELETE_CONFIRM: 'Tem certeza que deseja excluir este curso?',
  DELETE_ERROR: 'Erro ao excluir curso',
  DELETE_SUCCESS: 'Curso excluído com sucesso!',
  ENROLL_ERROR: 'Erro ao se inscrever no curso',
  ENROLL_SUCCESS: 'Inscrição realizada com sucesso!',
  LOAD_COURSES_ERROR: 'Erro ao carregar cursos. Tente novamente.',
  LOAD_ENROLLMENTS_ERROR: 'Erro ao carregar inscrições. Tente novamente.',
  NOT_AUTHENTICATED: 'Usuário não autenticado',
  NO_PERMISSION: 'Você não tem permissão para realizar esta ação',
}

const AcademyPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([])
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('created_at')

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  const loadInitialData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    
    try {
      const coursesQuery = isAdmin
        ? supabase.from('courses').select('*')
        : supabase.from('courses').select('*').eq('is_published', true)

      const [coursesRes, enrollmentsRes, progressRes, statsRes] = await Promise.all([
        coursesQuery.order('created_at', { ascending: false }),
        user && !isGuest 
          ? supabase
              .from('enrollments')
              .select('course_id')
              .eq('user_id', user.id)
          : Promise.resolve({ data: null, error: null }),
        user && !isGuest
          ? supabase
              .from('course_progress')
              .select('*')
              .eq('user_id', user.id)
          : Promise.resolve({ data: null, error: null }),
        isAdmin
          ? supabase
              .from('enrollments')
              .select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0, error: null }),
      ])

      if (coursesRes.error) {
        toast.error(ACADEMY_MESSAGES.LOAD_COURSES_ERROR)
        console.error('Error loading courses:', coursesRes.error)
        return
      }

      if (enrollmentsRes.error) {
        toast.error(ACADEMY_MESSAGES.LOAD_ENROLLMENTS_ERROR)
        console.error('Error loading enrollments:', enrollmentsRes.error)
      }
      
      // Map database names securely to types (Handles snake_case to camelCase fallbacks seamlessly)
      const coursesData: Course[] = (coursesRes.data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        thumbnailUrl: c.thumbnail_url || c.thumbnailUrl,
        level: c.level,
        durationHours: c.duration_hours || c.durationHours,
        isPublished: c.is_published !== undefined ? c.is_published : c.isPublished,
        createdAt: c.created_at || c.createdAt
      }))

      const enrollmentsData = enrollmentsRes.data || []
      const progressData = progressRes.data || []
      
      setCourses(coursesData)
      setEnrolledCourses(enrollmentsData.map((e: any) => e.course_id))
      
      const progressMap: Record<string, CourseProgress> = {}
      progressData.forEach((p: any) => {
        const courseIdKey = p.course_id || p.courseId
        progressMap[courseIdKey] = {
          courseId: courseIdKey,
          progressPercentage: p.progress_percentage || p.progressPercentage || 0,
          completedLessonsCount: p.completed_lessons_count || p.completedLessonsCount || 0,
          totalLessonsCount: p.total_lessons_count || p.totalLessonsCount || 0
        }
      })
      setCourseProgress(progressMap)
      
      if (isAdmin) {
        setEnrollmentCount(statsRes.count || 0)
      }
    } catch (error) {
      toast.error(ACADEMY_MESSAGES.LOAD_COURSES_ERROR)
      console.error('Unexpected error loading data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isGuest, user?.id, isAdmin])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const filteredAndSortedCourses = useMemo(() => {
    let filtered = [...courses]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      )
    }
    
    if (filterLevel) {
      filtered = filtered.filter(c => c.level === filterLevel)
    }
    
    filtered.sort((a, b) => {
      if (sortBy === 'created_at') {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (sortBy === 'students') {
        const aEnrolled = enrolledCourses.filter(id => id === a.id).length
        const bEnrolled = enrolledCourses.filter(id => id === b.id).length
        return bEnrolled - aEnrolled
      }
      return 0
    })

    return filtered
  }, [courses, searchQuery, filterLevel, sortBy, enrolledCourses])

  const handleEditorSuccess = useCallback(() => {
    loadInitialData(true)
    setEditingCourse(null)
    setEditorOpen(false)
  }, [loadInitialData])

  const handleEdit = useCallback((course: Course) => {
    setEditingCourse(course)
    setEditorOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!isAdmin) {
      toast.error(ACADEMY_MESSAGES.NO_PERMISSION)
      return
    }

    if (!confirm(ACADEMY_MESSAGES.DELETE_CONFIRM)) return

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success(ACADEMY_MESSAGES.DELETE_SUCCESS)
      loadInitialData(true)
    } catch (error) {
      toast.error(ACADEMY_MESSAGES.DELETE_ERROR)
      console.error('Error deleting course:', error)
    }
  }, [isAdmin, loadInitialData])

  const enrollCourse = useCallback(async (courseId: string) => {
    if (!user) {
      toast.error(ACADEMY_MESSAGES.NOT_AUTHENTICATED)
      return
    }

    try {
      const { error } = await supabase.from('enrollments').insert({
        course_id: courseId,
        user_id: user.id,
      })

      if (error) throw error

      setEnrolledCourses(prev => [...prev, courseId])
      toast.success(ACADEMY_MESSAGES.ENROLL_SUCCESS)
      loadInitialData(true)
    } catch (error) {
      toast.error(ACADEMY_MESSAGES.ENROLL_ERROR)
      console.error('Error enrolling course:', error)
    }
  }, [user, loadInitialData])

  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setFilterLevel(null)
    setSortBy('created_at')
  }, [])

  const getLevelBadge = (level?: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      beginner: { color: 'from-green-500 to-emerald-500 bg-green-500/10 text-emerald-600 dark:text-emerald-400', label: 'Básico' },
      intermediate: { color: 'from-amber-500 to-orange-500 bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Intermediário' },
      advanced: { color: 'from-red-500 to-rose-500 bg-red-500/10 text-rose-600 dark:text-rose-400', label: 'Avançado' },
    }
    return badges[level || 'beginner'] || badges.beginner
  }

  // Derived Values for UI Stats Stability
  const activePublishedCount = useMemo(() => courses.filter(c => c.isPublished).length, [courses])
  const averageCompletionRate = useMemo(() => {
    const progressArray = Object.values(courseProgress)
    if (!progressArray.length) return '0%'
    const total = progressArray.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0)
    return `${Math.round(total / progressArray.length)}%`
  }, [courseProgress])

  if (loading) {
    return (
      <Layout title="MER Academy">
        <LoadingState fullScreen message="Carregando ecossistema da Academy..." />
      </Layout>
    )
  }

  return (
    <Layout title="MER Academy">
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl bg-slate-900 transition-all duration-300">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&h=600&fit=crop&q=80"
              alt="Bible Study"
              className="w-full h-full object-cover opacity-20 dark:opacity-30 mix-blend-overlay transition-transform duration-700 scale-105 hover:scale-100"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/95 via-purple-900/90 to-slate-900/95" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-6">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-inner">
                <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-purple-300" />
                <span className="text-xs md:text-sm font-bold tracking-wider text-purple-100 uppercase">
                  {isAdmin ? 'Gestão de Conteúdo Admin' : 'MER Academy'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                      Formação{' '}
                      <span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-white bg-clip-text text-transparent">
                        Teológica & Bíblica
                      </span>
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-slate-200 font-medium leading-relaxed max-w-2xl">
                      Descubra profundidade no discipulado e crescimento de sua liderança espiritual. Fundamente sua caminhada de fé de forma prática.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                      Seu Discipulado Contínuo
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-slate-200 font-medium leading-relaxed max-w-2xl">
                      Cresça no conhecimento prático da palavra com uma jornada focada, emissão programática de certificados e métricas personalizadas.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight flex items-center gap-3 flex-wrap">
                      <Shield className="h-8 w-8 md:h-12 md:w-12 text-amber-400 animate-pulse" />
                      Painel de Controle Academy
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-slate-200 font-medium leading-relaxed max-w-2xl">
                      Publique novas trilhas de aprendizado, modifique o escopo programático atual e analise as taxas globais de engajamento operacional.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {isAdmin && (
                  <AdminAction>
                    <Button
                      onClick={() => { setEditingCourse(null); setEditorOpen(true); }}
                      size="lg"
                      className="bg-white text-indigo-900 hover:bg-slate-100 font-bold px-6 py-5 rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <Plus className="mr-2 h-5 w-5 stroke-[3]" />
                      Criar Novo Curso
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/about')}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-6 py-5 rounded-xl shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Tornar-se Membro Ativo
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => loadInitialData(true)}
                  disabled={refreshing}
                  className="border-white/20 text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm font-medium px-5 py-5 rounded-xl"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Sincronizando...' : 'Atualizar Dados'}
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        </Card>

        {/* Dash/Stats Bar */}
        {!isGuest && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatCard
              icon={BookOpen}
              label="Cursos Disponíveis"
              value={courses.length}
              gradient="from-blue-600 to-indigo-600"
            />
            <StatCard
              icon={TrendingUp}
              label={isAdmin ? 'Total de Matrículas' : 'Minhas Matrículas'}
              value={isAdmin ? enrollmentCount : enrolledCourses.length}
              gradient="from-purple-600 to-pink-600"
            />
            <StatCard
              icon={CheckCircle2}
              label={isAdmin ? 'Cursos Ativos ao Público' : 'Cursos em Progresso'}
              value={isAdmin ? activePublishedCount : enrolledCourses.length}
              gradient="from-emerald-600 to-teal-600"
            />
            <StatCard
              icon={BarChart3}
              label={isAdmin ? 'Média de Conclusão' : 'Conclusões / Histórico'}
              value={isAdmin ? averageCompletionRate : `${Object.values(courseProgress).filter(p => p.progressPercentage === 100).length} Concluído(s)`}
              gradient="from-amber-600 to-orange-600"
            />
          </div>
        )}

        {/* Filter Management Bar */}
        {courses.length > 0 && (
          <div className="bg-card border rounded-2xl p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por título do módulo ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-3">
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <select
                    value={filterLevel || ''}
                    onChange={(e) => setFilterLevel(e.target.value || null)}
                    className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Todos os Níveis</option>
                    <option value="beginner">Nível Básico</option>
                    <option value="intermediate">Nível Intermediário</option>
                    <option value="advanced">Nível Avançado</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="created_at">Mais Recentes</option>
                    <option value="title">Ordem Alfabética (A-Z)</option>
                    <option value="students">Relevância / Engajamento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Active Filters Breadcrumb */}
            {(searchQuery || filterLevel || sortBy !== 'created_at') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros Ativos:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-lg">
                    Busca: "{searchQuery}"
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                  </span>
                )}
                {filterLevel && (
                  <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-lg">
                    Nível: {getLevelBadge(filterLevel).label}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFilterLevel(null)} />
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-7 px-2 text-destructive hover:text-destructive/90">
                  Limpar Todos
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Section: My In-Progress Courses */}
        {!isGuest && enrolledCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2.5">
                <span className="w-2 h-6 rounded-full bg-emerald-500 inline-block" />
                {isAdmin ? 'Cursos Ativos Vinculados (Admin)' : 'Meus Cursos em Andamento'}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses
                .filter((c) => enrolledCourses.includes(c.id))
                .map((course) => {
                  const badge = getLevelBadge(course.level)
                  const progress = courseProgress[course.id]
                  const progressPercent = progress?.progressPercentage || 0

                  return (
                    <Card
                      key={`enrolled-${course.id}`}
                      className="group overflow-hidden border bg-card hover:shadow-xl transition-all duration-300 flex flex-col"
                    >
                      <div className="relative h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                        <div className="absolute top-3 right-3">
                          <span className={`px-2.5 py-1 backdrop-blur-md rounded-md ${badge.color} text-xs font-bold shadow-sm border border-black/5`}>
                            {badge.label}
                          </span>
                        </div>
                        
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
                          <span className="bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            Progresso Geral
                          </span>
                          <span className="font-bold bg-emerald-600 px-1.5 py-0.5 rounded">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h3 className="font-bold text-base md:text-lg text-foreground line-clamp-1 leading-tight group-hover:text-primary transition-colors">
                            {course.title}
                          </h3>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {course.description || 'Nenhuma descrição estendida fornecida para este módulo.'}
                          </p>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                          {/* Built-in Functional Sync Progress Meter */}
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>{progress?.completedLessonsCount || 0} de {progress?.totalLessonsCount || 0} aulas</span>
                              {progressPercent === 100 && <span className="text-emerald-500 font-bold">Completo!</span>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {course.durationHours ? `${course.durationHours}h` : 'N/A'}
                            </span>
                            <Button 
                              size="sm" 
                              onClick={() => navigate(`/academy/${course.id}`)}
                              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-semibold px-3 h-8 rounded-lg"
                            >
                              <Play className="h-3 w-3 mr-1 fill-current" />
                              Continuar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}

        {/* Section: General Catalog Display */}
        {filteredAndSortedCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2.5">
                <span className="w-2 h-6 rounded-full bg-indigo-500 inline-block" />
                {isGuest ? 'Cursos Disponíveis na Plataforma' : isAdmin ? 'Catálogo Geral (Todos os Registros)' : 'Explorar Catálogo Completo'}
              </h2>
              <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                {filteredAndSortedCourses.length} Encontrado(s)
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedCourses.map((course) => {
                const isEnrolled = enrolledCourses.includes(course.id)
                const badge = getLevelBadge(course.level)

                return (
                  <Card
                    key={`catalog-${course.id}`}
                    className="group overflow-hidden border bg-card hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative h-48 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                      
                      {/* Top Badges Stack */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        {isAdmin && !course.isPublished ? (
                          <span className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider rounded-md shadow-md">
                            Rascunho
                          </span>
                        ) : <div />}
                        
                        <span className={`px-2.5 py-1 backdrop-blur-md rounded-md ${badge.color} text-xs font-bold shadow-sm`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Floating Admin Tools Drawer */}
                      {isAdmin && (
                        <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); handleEdit(course); }} 
                            className="h-8 w-8 p-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-md"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={(e) => { e.stopPropagation(); handleDelete(course.id); }} 
                            className="h-8 w-8 p-0 shadow-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Content & Action Context Footer */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-base md:text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description || 'Nenhuma descrição estendida cadastrada para esta trilha académica.'}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        {course.durationHours && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/80" />
                            <span>Contém <strong className="text-foreground font-semibold">{course.durationHours} horas</strong> de carga programática</span>
                          </div>
                        )}

                        {isGuest ? (
                          <Button 
                            onClick={() => navigate('/about')} 
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold h-10 rounded-xl"
                          >
                            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                            Ver Grade Curricular
                          </Button>
                        ) : isEnrolled ? (
                          <Button 
                            onClick={() => navigate(`/academy/${course.id}`)}
                            className="w-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 text-xs font-bold h-10 rounded-xl"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                            Acessar Ambiente Virtual
                          </Button>
                        ) : (
                          <Button
                            onClick={() => enrollCourse(course.id)}
                            className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-xs font-bold h-10 rounded-xl transition-all"
                          >
                            Confirmar Matrícula Gratuita
                            <ChevronRight className="h-3.5 w-3.5 ml-1 stroke-[2.5]" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Guest Access Callout Frame */}
        {isGuest && filteredAndSortedCourses.length > 0 && (
          <GuestPrompt
            title="Inicie sua jornada teológica estruturada"
            description="Membros matriculados garantem livre acesso a todo o portfólio acadêmico, ferramentas de progresso persistente e certificados reconhecidos de conclusão."
            actionLabel="Solicitar Registro de Membro"
            onAction={() => navigate('/about')}
          />
        )}

        {/* Global Fallback Empty State Handler */}
        {filteredAndSortedCourses.length === 0 && (
          <EmptyState
            icon={searchQuery || filterLevel ? TrendingDown : GraduationCap}
            title={
              searchQuery || filterLevel
                ? 'Nenhum curso corresponde aos filtros'
                : isAdmin 
                ? 'Nenhum curso cadastrado no banco' 
                : 'Nenhum curso disponível no momento'
            }
            description={
              searchQuery || filterLevel
                ? 'Sugerimos limpar os termos de pesquisa ou remover as restrições de nível configuradas.'
                : isAdmin 
                ? 'Comece agora mesmo a estruturar sua primeira classe teológica para seus membros.'
                : 'Novas atualizações e módulos de ensino programático estão sendo homologados por nossa equipe.'
            }
            action={
              searchQuery || filterLevel ? (
                <Button variant="outline" onClick={handleClearFilters} className="rounded-xl mt-2">
                  Redefinir Busca
                </Button>
              ) : isAdmin ? (
                <AdminAction>
                  <Button onClick={() => { setEditingCourse(null); setEditorOpen(true); }} className="bg-primary text-primary-foreground rounded-xl mt-2">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeiro Curso
                  </Button>
                </AdminAction>
              ) : undefined
            }
          />
        )}
      </div>

      <CourseEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        course={editingCourse}
        onSuccess={handleEditorSuccess}
      />
    </Layout>
  )
}

export default AcademyPage
