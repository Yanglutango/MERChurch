import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { GraduationCap, Play, BookOpen, Clock, Award, TrendingUp, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '../types'
import { PageHeader } from '../components/shared/PageHeader'
import { StatCard } from '../components/shared/StatCard'
import { EmptyState } from '../components/shared/EmptyState'
import { LoadingState } from '../components/shared/LoadingState'
import { AdminAction } from '../components/shared/AdminAction'
import { CourseEditor } from '../components/admin/CourseEditor'

const AcademyPage = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  useEffect(() => {
    loadCourses()
    loadEnrollments()
  }, [])

  const loadCourses = async () => {
    setLoading(true)
    const query = user?.role === 'admin'
      ? supabase.from('courses').select('*')
      : supabase.from('courses').select('*').eq('is_published', true)

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading courses:', error)
      setLoading(false)
      return
    }

    setCourses(data)
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
      beginner: { color: 'from-green-500 to-emerald-500', label: 'Iniciante' },
      intermediate: { color: 'from-yellow-500 to-orange-500', label: 'Intermediário' },
      advanced: { color: 'from-red-500 to-rose-500', label: 'Avançado' },
    }
    return badges[level || 'beginner']
  }

  if (loading) {
    return (
      <Layout title="Escola EAD">
        <LoadingState fullScreen message="Carregando cursos..." />
      </Layout>
    )
  }

  return (
    <Layout title="Escola EAD">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Escola EAD - Academy"
          description="Cresça no conhecimento da Palavra de Deus"
          icon={GraduationCap}
          gradient="from-indigo-500 via-purple-500 to-pink-500"
          actions={
            <AdminAction>
              <Button onClick={() => { setEditingCourse(null); setEditorOpen(true); }} className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" />
                Criar Curso
              </Button>
            </AdminAction>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={BookOpen}
            label="Cursos Disponíveis"
            value={courses.filter(c => c.isPublished || user?.role === 'admin').length}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Cursos Inscritos"
            value={enrolledCourses.length}
            gradient="from-purple-500 to-pink-500"
          />
          <StatCard
            icon={Award}
            label="Cursos Concluídos"
            value={0}
            gradient="from-green-500 to-emerald-500"
          />
        </div>

        {/* My Courses */}
        {enrolledCourses.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Meus Cursos
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {courses
                .filter((c) => enrolledCourses.includes(c.id))
                .map((course) => {
                  const badge = getLevelBadge(course.level)
                  return (
                    <Card
                      key={course.id}
                      className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl cursor-pointer"
                    >
                      <div className="relative h-48 bg-muted">
                        <img
                          src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3">
                          <div className={`px-3 py-1 bg-gradient-to-r ${badge.color} text-white text-xs font-semibold rounded-full`}>
                            {badge.label}
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                          <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: '0%' }} />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-foreground mb-2">{course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {course.description}
                        </p>
                        {course.durationHours && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                            <Clock className="h-4 w-4" />
                            {course.durationHours}h
                          </div>
                        )}
                        <Button className="w-full" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Continuar
                        </Button>
                      </div>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}

        {/* All Courses */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Todos os Cursos
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const isEnrolled = enrolledCourses.includes(course.id)
              const badge = getLevelBadge(course.level)

              return (
                <Card
                  key={course.id}
                  className="group overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl"
                >
                  <div className="relative h-48 bg-muted">
                    <img
                      src={course.thumbnailUrl || 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&h=400&fit=crop'}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <div className={`px-3 py-1 bg-gradient-to-r ${badge.color} text-white text-xs font-semibold rounded-full`}>
                        {badge.label}
                      </div>
                    </div>
                    {!course.isPublished && user?.role === 'admin' && (
                      <div className="absolute top-3 left-3 px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
                        Rascunho
                      </div>
                    )}
                    <AdminAction>
                      <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="secondary" onClick={() => handleEdit(course)} className="h-8 w-8 p-0">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(course.id)} className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </AdminAction>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-foreground mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {course.description}
                    </p>
                    {course.durationHours && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Clock className="h-4 w-4" />
                        {course.durationHours}h de conteúdo
                      </div>
                    )}
                    <Button
                      onClick={() => !isEnrolled && enrollCourse(course.id)}
                      className="w-full"
                      variant={isEnrolled ? 'default' : 'outline'}
                      disabled={isEnrolled}
                    >
                      {isEnrolled ? (
                        <>
                          <Award className="h-4 w-4 mr-2" />
                          Inscrito
                        </>
                      ) : (
                        'Inscrever-se'
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {courses.length === 0 && (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum curso disponível"
            description="Novos cursos serão adicionados em breve"
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
