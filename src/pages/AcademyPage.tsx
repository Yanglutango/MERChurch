import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import {
  GraduationCap, BookOpen, Clock, TrendingUp, Plus, Edit2, Trash2, Shield,
  CheckCircle2, BarChart3, Search, RefreshCw, EyeOff, SlidersHorizontal, Star, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Course, CourseProgress } from '../types'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { CourseEditor } from '../components/admin/CourseEditor'

// Nível como sinal de progressão, não de alarme. Iniciante fica neutro (é só
// o ponto de partida); Intermediário usa a cor de acção da marca (teal);
// Avançado usa o dourado — o único acento raro reservado desde o início do
// redesign, aqui a marcar "mestria", o mesmo espírito da coroa em Departamentos.
const getLevelStyle = (level: string | undefined, t: (key: string) => string) => {
  const styles: Record<string, { label: string; className: string; icon?: typeof Star }> = {
    beginner: {
      label: t('academy.levels.beginner'),
      className: 'text-muted-foreground border-border',
    },
    intermediate: {
      label: t('academy.levels.intermediate'),
      className: 'text-primary border-primary/30',
    },
    advanced: {
      label: t('academy.levels.advanced'),
      className: 'border-transparent',
      icon: Star,
    },
  }
  return styles[level || 'beginner'] || styles.beginner
}

const ADVANCED_COLOR = '#D4A574'

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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Simplificado: o tipo AuthUser.role só admite 'member' | 'admin' | 'guest'.
  // A verificação anterior testava também 'administrator' e 'owner', valores
  // que não existem em lado nenhum do sistema de autenticação — código morto
  // disfarçado de correcção de bug. Alinhado com o padrão usado em todas as
  // outras páginas da app.
  const isAdmin = user?.role === 'admin'

  const loadInitialData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const coursesQuery = isAdmin
        ? supabase.from('courses').select('*')
        : supabase.from('courses').select('*').eq('is_published', true)

      const [coursesRes, enrollmentsRes, statsRes] = await Promise.all([
        coursesQuery.order('created_at', { ascending: false }),
        user?.id
          ? supabase.from('enrollments').select('course_id, progress, completed').eq('user_id', user.id)
          : Promise.resolve({ data: null, error: null }),
        isAdmin
          ? supabase.from('enrollments').select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0, error: null }),
      ])

      if (coursesRes.error) throw coursesRes.error

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

      setCourses(coursesData)
      setEnrolledCourses((enrollmentsRes.data || []).map((e: any) => e.course_id))

      const progressMap: Record<string, CourseProgress> = {}
      ;(enrollmentsRes.data || []).forEach((e: any) => {
        progressMap[e.course_id] = {
          id: e.course_id,
          userId: user?.id || '',
          courseId: e.course_id,
          progressPercentage: e.progress || 0,
          completedLessonsCount: e.completed ? 1 : 0,
          totalLessonsCount: 1,
          lastAccessedAt: new Date().toISOString(),
        }
      })
      setCourseProgress(progressMap)

      if (isAdmin) setEnrollmentCount(statsRes.count || 0)
    } catch (error) {
      toast.error(t('academy.messages.loadCoursesError'))
      console.error('Database sync error:', error)
    } finally {
      // Corrigido: a versão anterior usava `loading && setLoading(false)`,
      // testando o valor do ESTADO (não um parâmetro), o que é uma condição
      // sem sentido real — funcionava por coincidência. Agora usa o
      // parâmetro isSilent, que é a intenção original: refresh silencioso
      // não deve mexer no spinner de carregamento inicial.
      if (!isSilent) setLoading(false)
      setRefreshing(false)
    }
  }, [isAdmin, user?.id, t])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const filteredAndSortedCourses = useMemo(() => {
    let filtered = [...courses]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query)
      )
    }
    if (filterLevel) filtered = filtered.filter(c => c.level === filterLevel)
    return filtered
  }, [courses, searchQuery, filterLevel])

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setEditorOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('courses').delete().eq('id', deleteTargetId)
      if (error) throw error
      toast.success(t('academy.messages.deleteSuccess'))
      loadInitialData(true)
    } catch (error) {
      toast.error(t('academy.messages.deleteError'))
    } finally {
      setDeleting(false)
      setDeleteTargetId(null)
    }
  }

  const enrollCourse = async (courseId: string) => {
    if (!user?.id) return
    try {
      const { error } = await supabase.from('enrollments').insert({ course_id: courseId, user_id: user.id })
      if (error) throw error
      toast.success(t('academy.messages.enrollSuccess'))
      loadInitialData(true)
    } catch (error) {
      toast.error(t('academy.messages.enrollError'))
    }
  }

  if (loading) {
    return <LoadingState fullScreen message={t('academy.loadingMessage')} />
  }

  const statItems = [
    { icon: BookOpen, label: t('academy.stats.totalCatalog'), value: courses.length },
    { icon: TrendingUp, label: isAdmin ? t('academy.stats.activeEnrollments') : t('academy.stats.myCourses'), value: isAdmin ? enrollmentCount : enrolledCourses.length },
    { icon: CheckCircle2, label: t('academy.stats.publishedModules'), value: courses.filter(c => c.isPublished).length },
    { icon: BarChart3, label: t('academy.stats.hiddenDrafts'), value: courses.filter(c => !c.isPublished).length },
  ]

  return (
    <Layout title={t('nav.academy')}>
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Barra de admin — trocado o retângulo tracejado índigo (que era o
            principal responsável pelo "óptimo no dark, lavado no light",
            por causa da opacidade sobre fundos diferentes) por tokens
            semânticos que já se adaptam correctamente aos dois modos. */}
        {isAdmin && (
          <Card className="p-4 border rounded-lg bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.75} />
              <div>
                <h2 className="text-sm font-medium text-foreground">{t('academy.admin.panelTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('academy.admin.panelDesc')}</p>
              </div>
            </div>
            <Button
              onClick={() => { setEditingCourse(null); setEditorOpen(true) }}
              size="sm"
              className="w-full sm:w-auto rounded-md flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />{t('academy.admin.createCourse')}
            </Button>
          </Card>
        )}

        {/* Estatísticas — células neutras, sem arco-íris de gradientes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map((item, idx) => (
            <Card key={idx} className="border rounded-lg">
              <div className="p-4">
                <item.icon className="h-4 w-4 text-muted-foreground mb-3" strokeWidth={1.75} />
                <div className="text-xl font-semibold text-foreground tabular-nums">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Busca e filtros */}
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('academy.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterLevel || ''}
              onChange={(e) => setFilterLevel(e.target.value || null)}
              className="h-9 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t('academy.allLevels')}</option>
              <option value="beginner">{t('academy.levels.beginner')}</option>
              <option value="intermediate">{t('academy.levels.intermediate')}</option>
              <option value="advanced">{t('academy.levels.advanced')}</option>
            </select>
            <Button variant="outline" size="icon" onClick={() => loadInitialData(true)} className="h-9 w-9 rounded-md flex-shrink-0">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Catálogo */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            {t('academy.catalogTitle')}
          </h2>

          {filteredAndSortedCourses.length === 0 ? (
            <EmptyState icon={GraduationCap} title={t('academy.empty.title')} description={t('academy.empty.description')} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedCourses.map((course) => {
                const isEnrolled = enrolledCourses.includes(course.id)
                const progress = courseProgress[course.id]
                const level = getLevelStyle(course.level, t)
                const LevelIcon = level.icon

                return (
                  <Card key={course.id} className="border rounded-lg overflow-hidden flex flex-col">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md border bg-background/90 backdrop-blur-sm ${level.className}`}
                          style={course.level === 'advanced' ? { color: ADVANCED_COLOR, borderColor: `${ADVANCED_COLOR}50` } : undefined}
                        >
                          {LevelIcon && <LevelIcon className="h-2.5 w-2.5" style={{ color: ADVANCED_COLOR }} fill={ADVANCED_COLOR} />}
                          {level.label}
                        </span>
                        {!course.isPublished && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-medium rounded-md">
                            <EyeOff className="h-2.5 w-2.5" />{t('academy.card.draft')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3 className="font-medium text-sm text-foreground line-clamp-1">{course.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description || t('academy.card.noDescription')}
                        </p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                          <Clock className="h-3 w-3" strokeWidth={1.75} />
                          {t('academy.card.durationHours')}: {course.durationHours || 0}h
                        </div>
                      </div>

                      {/* Progresso real — antes calculado e nunca mostrado.
                          Usa o valor genuíno de enrollments.progress, sem
                          inventar dados que a base não tem. */}
                      {isEnrolled && !isAdmin && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium text-foreground tabular-nums">{progress?.progressPercentage || 0}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${progress?.progressPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border">
                        {isAdmin ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(course)} className="text-xs rounded-md">
                              <Edit2 className="h-3 w-3 mr-1.5" />{t('common.edit')}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteTargetId(course.id)} className="text-xs rounded-md text-destructive border-destructive/30 hover:bg-destructive/10">
                              <Trash2 className="h-3 w-3 mr-1.5" />{t('academy.card.delete')}
                            </Button>
                          </div>
                        ) : isEnrolled ? (
                          <Button size="sm" onClick={() => navigate(`/academy/${course.id}`)} className="w-full text-xs rounded-md">
                            {t('academy.card.accessLessons')}
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => enrollCourse(course.id)} className="w-full text-xs rounded-md">
                            {t('academy.card.enroll')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <CourseEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        course={editingCourse}
        onSuccess={() => {
          loadInitialData(true)
          setEditingCourse(null)
          setEditorOpen(false)
        }}
      />

      <AlertDialog open={!!deleteTargetId} onOpenChange={open => { if (!open) setDeleteTargetId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('academy.messages.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  )
}

export default AcademyPage
