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
  CheckCircle2, 
  BarChart3, 
  Search, 
  RefreshCw, 
  X, 
  ChevronRight,
  EyeOff,
  SlidersHorizontal
} from 'lucide-react'
import { toast } from 'sonner'
import type { Course, Enrollment, CourseProgress } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { CourseEditor } from '../components/admin/CourseEditor'

// Helper externo adaptado para aceitar a função t dinamicamente
const getLevelBadge = (level: string | undefined, t: (key: string) => string) => {
  const badges: Record<string, { color: string; label: string }> = {
    beginner: { color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400', label: t('academy.levels.beginner') },
    intermediate: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', label: t('academy.levels.intermediate') },
    advanced: { color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', label: t('academy.levels.advanced') },
  }
  return badges[level || 'beginner'] || badges.beginner
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

  // Correção do Glitch: Avaliação direta por string primitiva. Evita loops de re-renderização.
  const userRoleString = user?.role ? String(user.role).toLowerCase() : ''
  const isAdmin = userRoleString === 'admin' || userRoleString === 'administrator' || userRoleString === 'owner'

  // loadInitialData reage estritamente a propriedades primitivas agora (isAdmin estável)
  const loadInitialData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    
    try {
      const coursesQuery = isAdmin
        ? supabase.from('courses').select('*')
        : supabase.from('courses').select('*').eq('is_published', true)

      // Uses `enrollments` for both enrolled list and progress (progress + completed fields)
      // Note: `course_progress` table does not exist; progress lives in enrollments.progress
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
      
      // Build progress map from enrollment data (progress = 0-100 integer, completed = boolean)
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
      
      if (isAdmin) {
        setEnrollmentCount(statsRes.count || 0)
      }
    } catch (error) {
      toast.error(t('academy.messages.loadCoursesError'))
      console.error('Database sync error:', error)
    } finally {
      loading && setLoading(false)
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
    if (filterLevel) {
      filtered = filtered.filter(c => c.level === filterLevel)
    }
    return filtered
  }, [courses, searchQuery, filterLevel])

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('academy.messages.deleteConfirm'))) return
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id)
      if (error) throw error
      toast.success(t('academy.messages.deleteSuccess'))
      loadInitialData(true)
    } catch (error) {
      toast.error(t('academy.messages.deleteError'))
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

  return (
    <Layout title={t('nav.academy')}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
        
        {/* BARRA EXCLUSIVA DO ADMINISTRADOR-CHEFE */}
        {isAdmin && (
          <Card className="p-4 border-2 border-dashed border-indigo-500/40 bg-indigo-500/[0.02] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
                <Shield className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  {t('academy.admin.panelTitle')}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t('academy.admin.panelDesc')}
                </p>
              </div>
            </div>
            <Button
              onClick={() => { setEditingCourse(null); setEditorOpen(true); }}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              {t('academy.admin.createCourse')}
            </Button>
          </Card>
        )}

        {/* Métricas de Performance Real */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label={t('academy.stats.totalCatalog')} value={courses.length} gradient="from-blue-600 to-indigo-600" />
          <StatCard icon={TrendingUp} label={isAdmin ? t('academy.stats.activeEnrollments') : t('academy.stats.myCourses')} value={isAdmin ? enrollmentCount : enrolledCourses.length} gradient="from-purple-600 to-pink-600" />
          <StatCard icon={CheckCircle2} label={t('academy.stats.publishedModules')} value={courses.filter(c => c.isPublished).length} gradient="from-emerald-600 to-teal-600" />
          <StatCard icon={BarChart3} label={t('academy.stats.hiddenDrafts')} value={courses.filter(c => !c.isPublished).length} gradient="from-amber-600 to-orange-600" />
        </div>

        {/* Barra de Busca Avançada */}
        <div className="bg-card border rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('academy.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterLevel || ''}
              onChange={(e) => setFilterLevel(e.target.value || null)}
              className="px-3 py-2 text-sm bg-background border rounded-xl focus:outline-none focus:text-foreground"
            >
              <option value="">{t('academy.allLevels')}</option>
              <option value="beginner">{t('academy.levels.beginner')}</option>
              <option value="intermediate">{t('academy.levels.intermediate')}</option>
              <option value="advanced">{t('academy.levels.advanced')}</option>
            </select>
            <Button variant="outline" size="icon" onClick={() => loadInitialData(true)} className="rounded-xl shrink-0">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Grade do Catálogo de Cursos */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
            {t('academy.catalogTitle')}
          </h3>

          {filteredAndSortedCourses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={t('academy.empty.title')}
              description={t('academy.empty.description')}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedCourses.map((course) => {
                const isEnrolled = enrolledCourses.includes(course.id)
                const badge = getLevelBadge(course.level, t)

                return (
                  <Card key={course.id} className="border bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${badge.color}`}>
                          {badge.label}
                        </span>
                        {!course.isPublished && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-black uppercase rounded-md shadow">
                            <EyeOff className="h-2.5 w-2.5" /> {t('academy.card.draft')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-foreground line-clamp-1">{course.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description || t('academy.card.noDescription')}
                        </p>
                      </div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {t('academy.card.durationHours')}: {course.durationHours || 0}h
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        {isAdmin ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(course)}
                              className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 rounded-xl flex items-center justify-center gap-1"
                            >
                              <Edit2 className="h-3 w-3" />
                              {t('common.edit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(course.id)}
                              className="text-xs rounded-xl flex items-center justify-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              {t('academy.card.delete')}
                            </Button>
                          </div>
                        ) : isEnrolled ? (
                          <Button onClick={() => navigate(`/academy/${course.id}`)} className="w-full text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                            {t('academy.card.accessLessons')}
                          </Button>
                        ) : (
                          <Button onClick={() => enrollCourse(course.id)} className="w-full text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black">
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
          loadInitialData(true);
          setEditingCourse(null);
          setEditorOpen(false);
        }}
      />
    </Layout>
  )
}

export default AcademyPage
