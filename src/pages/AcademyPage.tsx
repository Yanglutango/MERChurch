import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { GraduationCap, Play, BookOpen, Clock, Award, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '../types'

const AcademyPage = () => {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<string[]>([])

  useEffect(() => {
    loadCourses()
    loadEnrollments()
  }, [])

  const loadCourses = async () => {
    const { data, error} = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading courses:', error)
      return
    }

    setCourses(data)
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

  return (
    <Layout title="Escola EAD">
      <div className="space-y-6">
        {/* Header */}
        <Card className="p-8 border-2 bg-gradient-to-r from-primary via-purple-500 to-secondary text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-2xl">
              <GraduationCap className="h-12 w-12" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Escola EAD - Academy</h1>
              <p className="text-white/90 text-lg">Cresça no conhecimento da Palavra de Deus</p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-2 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{courses.length}</div>
            <div className="text-sm text-muted-foreground">Cursos Disponíveis</div>
          </Card>
          <Card className="p-4 border-2 text-center">
            <div className="text-3xl font-bold text-primary mb-1">{enrolledCourses.length}</div>
            <div className="text-sm text-muted-foreground">Cursos Inscritos</div>
          </Card>
          <Card className="p-4 border-2 text-center">
            <div className="text-3xl font-bold text-primary mb-1">0</div>
            <div className="text-sm text-muted-foreground">Cursos Concluídos</div>
          </Card>
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
                      className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl cursor-pointer"
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
                  className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl"
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
          <Card className="p-12 text-center border-2">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum curso disponível no momento</p>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default AcademyPage
