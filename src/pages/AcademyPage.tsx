import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppStore } from '../stores/appStore'
import { GraduationCap, Play, BookOpen, Clock, Award, TrendingUp, Plus, Edit2, Trash2, Shield, UserPlus, CheckCircle2, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '../types'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { GuestPrompt } from '../components/shared/GuestPrompt'
import { CourseEditor } from '../components/admin/CourseEditor'

const AcademyPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useAppStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const isGuest = user?.role === 'guest'
  const isMember = user?.role === 'member'
  const isAdmin = user?.role === 'admin'

  const [enrollmentCount, setEnrollmentCount] = useState(0)

  useEffect(() => {
    loadCourses()
    if (!isGuest) {
      loadEnrollments()
    }
  }, [])

  const loadEnrollmentStats = async () => {
    if (isAdmin) {
      const { count } = await supabase.from('enrollments').select('id', { count: 'exact', head: true })
      setEnrollmentCount(count || 0)
    }
  }

  const loadCourses = async () => {
    setLoading(true)
    const query = isAdmin
      ? supabase.from('courses').select('*')
      : supabase.from('courses').select('*').eq('is_published', true)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading courses:', error)
      setLoading(false)
      return
    }

    setCourses(data)
    loadEnrollmentStats()
    setLoading(false)
  }

  const loadEnrollments = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('user_id', user!.id)

    if (error) {
      console.error('Error loading enrollments:', error)
      return
    }

    setEnrolledCourses(data.map((e) => e.course_id))
  }

  const handleEditorSuccess = () => {
    loadCourses()
    setEditingCourse(null)
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este curso?')) return

    const { error } = await supabase.from('courses').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir curso')
      return
    }

    toast.success('Curso excluído com sucesso!')
    loadCourses()
  }

  const enrollCourse = async (courseId: string) => {
    const { error } = await supabase.from('enrollments').insert({
      course_id: courseId,
      user_id: user!.id,
    })

    if (error) {
      toast.error('Erro ao se inscrever no curso')
      return
    }

    setEnrolledCourses([...enrolledCourses, courseId])
    toast.success('Inscrição realizada com sucesso!')
  }

  const getLevelBadge = (level?: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      beginner: { color: 'from-green-500 to-emerald-500', label: 'Básico' },
      intermediate: { color: 'from-yellow-500 to-orange-500', label: 'Intermediário' },
      advanced: { color: 'from-red-500 to-rose-500', label: 'Avançado' },
    }
    return badges[level || 'beginner']
  }

  if (loading) {
    return (
      <Layout title="MER Academy">
        <LoadingState fullScreen message="Carregando cursos..." />
      </Layout>
    )
  }

  const publishedCourses = courses.filter(c => c.isPublished || isAdmin)

  return (
    <Layout title="MER Academy">
      <div className="space-y-6">
        {/* Hero Banner - Contextual */}
        <Card className="relative overflow-hidden border-0 shadow-2xl rounded-2xl elevation-3">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1920&h=600&fit=crop&q=80"
              alt="Bible Study"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/96 via-purple-700/94 to-pink-700/92" />
          </div>
          
          <div className="relative z-10 p-6 md:p-10 lg:p-14 text-white">
            <div className="max-w-4xl space-y-5 md:space-y-7">
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 shadow-lg">
                <GraduationCap className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {isAdmin ? 'GESTÃO DA ACADEMY' : 'MER ACADEMY'}
                </span>
              </div>

              <div className="space-y-4">
                {isGuest && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Formação{' '}
                      <span className="bg-gradient-to-r from-white via-yellow-200 to-white bg-clip-text text-transparent">
                        Bíblica
                      </span>
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Descubra cursos de discipulado e crescimento espiritual. Fundamente sua fé na Palavra.
                    </p>
                  </>
                )}
                
                {isMember && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight">
                      Seu Discipulado Contínuo
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Cresça no conhecimento da Palavra. Cursos práticos, certificados e jornada personalizada.
                    </p>
                  </>
                )}
                
                {isAdmin && (
                  <>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.15] tracking-tight flex items-center gap-3 md:gap-4 flex-wrap">
                      <Shield className="h-10 w-10 md:h-14 md:w-14 text-yellow-300" />
                      Gerenciar Cursos
                    </h1>
                    <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium leading-relaxed max-w-2xl">
                      Crie, organize e acompanhe cursos de formação. Discipule com eficácia e estratégia.
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {isAdmin && (
                  <AdminAction>
                    <Button
                      onClick={() => { setEditingCourse(null); setEditorOpen(true); }}
                      size="lg"
                      className="bg-white text-indigo-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Novo Curso
                    </Button>
                  </AdminAction>
                )}
                {isGuest && (
                  <Button
                    size="lg"
                    onClick={() => navigate('/about')}
                    className="bg-white text-indigo-700 hover:bg-white/95 font-bold px-7 py-6 rounded-full shadow-2xl transform hover:scale-105 transition-all"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Tornar-se Membro
                  </Button>
                )}
                {!isGuest && publishedCourses.length > 0 && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-white/80 text-white hover:bg-white/10 backdrop-blur-sm font-bold px-7 py-6 rounded-full"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    {enrolledCourses.length} Inscritos
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-400/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </Card>

        {/* Stats - Apenas para Member/Admin */}
        {!isGuest && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            <StatCard
              icon={BookOpen}
              label="Cursos Disponíveis"
              value={publishedCourses.length}
              gradient="from-blue-600 to-cyan-600"
            />
            <StatCard
              icon={TrendingUp}
              label={isAdmin ? 'Total de Inscrições' : 'Meus Cursos'}
              value={isAdmin ? enrollmentCount : enrolledCourses.length}
              gradient="from-purple-600 to-pink-600"
            />
            <StatCard
              icon={Award}
              label={isAdmin ? 'Cursos Publicados' : 'Certificados'}
              value={isAdmin ? courses.filter(c => c.isPublished).length : 0}
              gradient="from-green-600 to-emerald-600"
            />
            <StatCard
              icon={BarChart3}
              label={isAdmin ? 'Total de Cursos' : 'Inscrições'}
              value={isAdmin ? courses.length : enrolledCourses.length}
              gradient="from-amber-600 to-orange-600"
            />
          </div>
        )}

        {/* My Courses - Apenas Member/Admin */}
        {!isGuest && enrolledCourses.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-md">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                {isAdmin ? 'Cursos em Andamento' : 'Meus Cursos'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses
                .filter((c) => enrolledCourses.includes(c.id))
                .map((course) => {
                  const badge = getLevelBadge(course.level)
                  return (
                    <Card
                      key={course.id}
                      className="group overflow-hidden border-2 hover:border-green-500/50 transition-all hover:shadow-xl cursor-pointer elevation-1"
                    >
                      <div className="relative h-48">
                        <img
                          src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        <div className="absolute top-3 right-3">
                          <div className={`px-3 py-1.5 bg-gradient-to-r ${badge.color} text-white text-xs font-bold rounded-full shadow-lg`}>
                            {badge.label}
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                          <div className="h-full bg-gradient-to-r from-green-600 to-emerald-600" style={{ width: '0%' }} />
                        </div>
                      </div>
                      <div className="p-5 md:p-6 space-y-3">
                        <h3 className="font-bold text-lg md:text-xl text-foreground line-clamp-2 leading-tight">{course.title}</h3>
                        {course.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                        {course.durationHours && (
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                              <Clock className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-semibold">{course.durationHours}h de conteúdo</span>
                          </div>
                        )}
                        <Button className="w-full gradient-primary text-white font-semibold" onClick={() => navigate(`/academy/${course.id}`)}>
                          <Play className="h-4 w-4 mr-2" />
                          Continuar Curso
                        </Button>
                      </div>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}

        {/* All Courses */}
        {publishedCourses.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                {isGuest ? 'Cursos Disponíveis' : isAdmin ? 'Todos os Cursos' : 'Catálogo Completo'}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {publishedCourses.map((course) => {
                const isEnrolled = enrolledCourses.includes(course.id)
                const badge = getLevelBadge(course.level)

                return (
                  <Card
                    key={course.id}
                    className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl elevation-1"
                  >
                    <div className="relative h-48">
                      <img
                        src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute top-3 right-3">
                        <div className={`px-3 py-1.5 bg-gradient-to-r ${badge.color} text-white text-xs font-bold rounded-full shadow-lg`}>
                          {badge.label}
                        </div>
                      </div>
                      {!course.isPublished && isAdmin && (
                        <div className="absolute top-3 left-3 px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-full shadow-lg">
                          Rascunho
                        </div>
                      )}
                      {isAdmin && (
                        <AdminAction>
                          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(course)} className="h-8 w-8 p-0 backdrop-blur-md">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(course.id)} className="h-8 w-8 p-0">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </AdminAction>
                      )}
                    </div>

                    <div className="p-5 md:p-6 space-y-3">
                      <h3 className="font-bold text-lg md:text-xl text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>
                      )}
                      {course.durationHours && (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">{course.durationHours}h de conteúdo</span>
                        </div>
                      )}
                      
                      {isGuest ? (
                        <Button onClick={() => navigate('/about')} className="w-full gradient-primary text-white font-semibold">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Acessar Curso
                        </Button>
                      ) : isEnrolled ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={() => navigate(`/academy/${course.id}`)}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Ver Curso
                        </Button>
                      ) : (
                        <Button
                          onClick={() => enrollCourse(course.id)}
                          className="w-full gradient-primary text-white font-semibold"
                        >
                          Inscrever-se
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Guest Prompt */}
        {isGuest && publishedCourses.length > 0 && (
          <GuestPrompt
            title="Inicie sua formação bíblica"
            description="Membros têm acesso completo a todos os cursos, acompanhamento de progresso e certificados de conclusão."
            actionLabel="Tornar-se Membro"
            onAction={() => navigate('/about')}
          />
        )}

        {/* Empty State */}
        {publishedCourses.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title={isAdmin ? 'Nenhum curso criado' : 'Nenhum curso disponível'}
            description={isAdmin ? 'Crie o primeiro curso da Academy' : 'Novos cursos serão adicionados em breve'}
            action={
              isAdmin ? (
                <AdminAction>
                  <Button onClick={() => { setEditingCourse(null); setEditorOpen(true); }} className="gradient-primary text-white">
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
