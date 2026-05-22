import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  GraduationCap, Play, BookOpen, Clock, CheckCircle2, ChevronLeft,
  Lock, ArrowRight, CheckSquare, Square,
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'

interface Lesson {
  id: string
  course_id: string
  title: string
  content: string | null
  video_url: string | null
  order_index: number
  duration_minutes: number | null
}

interface CourseDetail {
  id: string
  title: string
  description: string | null
  instructor_id: string | null
  thumbnail_url: string | null
  duration_hours: number | null
  level: string | null
  is_published: boolean
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado',
}

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [completedLessons, setCompletedLessons] = useState<string[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => {
    if (courseId) loadCourse()
  }, [courseId])

  const loadCourse = async () => {
    setLoading(true)
    const [courseRes, lessonsRes, enrollRes, progressRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', courseId).single(),
      supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index', { ascending: true }),
      supabase.from('enrollments').select('id').eq('course_id', courseId).eq('user_id', user!.id).maybeSingle(),
      supabase.from('user_lesson_progress').select('lesson_id').eq('user_id', user!.id),
    ])

    if (courseRes.error || !courseRes.data) {
      toast.error('Curso não encontrado')
      navigate('/academy')
      return
    }

    setCourse(courseRes.data)
    setLessons(lessonsRes.data || [])
    setIsEnrolled(!!enrollRes.data)
    setCompletedLessons(progressRes.data?.map((p: any) => p.lesson_id) || [])
    if (lessonsRes.data && lessonsRes.data.length > 0) setSelectedLesson(lessonsRes.data[0])
    setLoading(false)
  }

  const enroll = async () => {
    setEnrolling(true)
    const { error } = await supabase.from('enrollments').insert({ course_id: courseId, user_id: user!.id })
    if (error) { toast.error('Erro ao se inscrever'); setEnrolling(false); return }
    setIsEnrolled(true)
    toast.success('Inscrição realizada! Bom estudo! 📖')
    setEnrolling(false)
  }

  const toggleLessonComplete = async (lessonId: string) => {
    const isCompleted = completedLessons.includes(lessonId)
    if (isCompleted) {
      await supabase.from('user_lesson_progress').delete().eq('lesson_id', lessonId).eq('user_id', user!.id)
      setCompletedLessons(completedLessons.filter(id => id !== lessonId))
    } else {
      await supabase.from('user_lesson_progress').upsert({ user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() })
      setCompletedLessons([...completedLessons, lessonId])
      toast.success('Aula concluída! 🎉')
    }
  }

  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.filter(id => lessons.some(l => l.id === id)).length / lessons.length) * 100) : 0

  if (loading) return <Layout title="Curso"><LoadingState fullScreen message="Carregando curso..." /></Layout>
  if (!course) return <Layout title="Curso"><EmptyState icon={GraduationCap} title="Curso não encontrado" description="Este curso não existe ou foi removido." action={<Button onClick={() => navigate('/academy')} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white">Voltar à Academy</Button>} /></Layout>

  return (
    <Layout title={course.title}>
      <div className="space-y-5">
        {/* Breadcrumb + header */}
        <div className="flex items-center gap-2 pb-1 border-b border-border">
          <Button size="sm" variant="ghost" onClick={() => navigate('/academy')} className="h-8 px-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4 mr-1" />Academy
          </Button>
          <span className="text-muted-foreground text-sm">/</span>
          <h1 className="text-sm font-semibold text-foreground truncate">{course.title}</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* ── Left: Lesson list ─────────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-3">
            {/* Course meta */}
            <Card className="p-4 border">
              {course.thumbnail_url && (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-3" />
              )}
              <h2 className="font-bold text-foreground leading-tight mb-1">{course.title}</h2>
              {course.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{course.description}</p>}

              <div className="flex flex-wrap gap-2 text-xs mb-3">
                {course.level && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary font-semibold rounded-full">
                    {LEVEL_LABELS[course.level] || course.level}
                  </span>
                )}
                {course.duration_hours && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />{course.duration_hours}h
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {isEnrolled && lessons.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold text-foreground">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0A2E4A] to-[#4A90A4] rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {completedLessons.filter(id => lessons.some(l => l.id === id)).length} / {lessons.length} aulas concluídas
                  </p>
                </div>
              )}

              {!isEnrolled ? (
                <Button onClick={enroll} disabled={enrolling} className="w-full bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold h-9">
                  {enrolling ? 'Inscrevendo...' : 'Inscrever-se no Curso'}
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />Inscrito
                </div>
              )}
            </Card>

            {/* Lesson list */}
            <Card className="border overflow-hidden">
              <div className="p-3 border-b border-border bg-muted/30">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Aulas ({lessons.length})
                </h3>
              </div>
              <div className="divide-y divide-border">
                {lessons.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">Nenhuma aula disponível.</p>
                ) : lessons.map((lesson, idx) => {
                  const isCompleted = completedLessons.includes(lesson.id)
                  const isSelected = selectedLesson?.id === lesson.id
                  const canAccess = isEnrolled

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => canAccess && setSelectedLesson(lesson)}
                      disabled={!canAccess}
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${isSelected ? 'bg-[#0A2E4A]/8 dark:bg-[#4A90A4]/10' : canAccess ? 'hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : canAccess ? (
                          <div className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'border-[#0A2E4A]' : 'border-muted-foreground/40'} flex items-center justify-center`}>
                            <span className="text-[8px] font-bold text-muted-foreground">{idx + 1}</span>
                          </div>
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-[#0A2E4A] dark:text-[#7bbdd4]' : 'text-foreground'}`}>
                          {lesson.title}
                        </p>
                        {lesson.duration_minutes && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="inline h-2.5 w-2.5 mr-0.5" />{lesson.duration_minutes}min
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* ── Right: Lesson content ─────────────────────────────────── */}
          <div className="lg:col-span-2">
            {!isEnrolled ? (
              <Card className="h-full min-h-[400px] flex items-center justify-center border border-dashed">
                <div className="text-center space-y-4 p-8 max-w-sm">
                  <div className="inline-flex p-5 bg-muted rounded-2xl">
                    <Lock className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg">Inscreva-se para acessar</h3>
                    <p className="text-sm text-muted-foreground mt-1">Este curso tem {lessons.length} aulas disponíveis após a inscrição.</p>
                  </div>
                  <Button onClick={enroll} disabled={enrolling} className="bg-[#0A2E4A] hover:bg-[#0d3a5c] text-white font-bold">
                    <ArrowRight className="mr-2 h-4 w-4" />{enrolling ? 'Inscrevendo...' : 'Inscrever Gratuitamente'}
                  </Button>
                </div>
              </Card>
            ) : !selectedLesson ? (
              <Card className="h-full min-h-[400px] flex items-center justify-center border border-dashed">
                <div className="text-center space-y-3 p-8">
                  <Play className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">Selecione uma aula para começar</p>
                </div>
              </Card>
            ) : (
              <Card className="border shadow-sm overflow-hidden">
                {/* Video */}
                {selectedLesson.video_url && (
                  <div className="aspect-video bg-black">
                    {selectedLesson.video_url.includes('youtube.com') || selectedLesson.video_url.includes('youtu.be') ? (
                      <iframe
                        src={selectedLesson.video_url.replace('watch?v=', 'embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedLesson.title}
                      />
                    ) : (
                      <video src={selectedLesson.video_url} className="w-full h-full" controls playsInline />
                    )}
                  </div>
                )}

                {/* Lesson content */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-foreground text-lg leading-tight">{selectedLesson.title}</h2>
                      {selectedLesson.duration_minutes && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{selectedLesson.duration_minutes} minutos
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleLessonComplete(selectedLesson.id)}
                      className={`flex-shrink-0 h-8 px-3 text-xs font-bold ${completedLessons.includes(selectedLesson.id) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                    >
                      {completedLessons.includes(selectedLesson.id) ? (
                        <><CheckSquare className="h-3.5 w-3.5 mr-1.5" />Concluída</>
                      ) : (
                        <><Square className="h-3.5 w-3.5 mr-1.5" />Marcar Concluída</>
                      )}
                    </Button>
                  </div>

                  {selectedLesson.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</div>
                    </div>
                  )}

                  {/* Next lesson */}
                  {(() => {
                    const currentIdx = lessons.findIndex(l => l.id === selectedLesson.id)
                    const nextLesson = lessons[currentIdx + 1]
                    return nextLesson ? (
                      <div className="pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Próxima aula</p>
                        <button onClick={() => setSelectedLesson(nextLesson)}
                          className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all w-full text-left">
                          <div className="p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
                            <Play className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-foreground truncate">{nextLesson.title}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
                        </button>
                      </div>
                    ) : (
                      <div className="pt-4 border-t border-border text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                        <p className="text-sm font-bold text-foreground">Você chegou ao fim do curso!</p>
                        <p className="text-xs text-muted-foreground">Parabéns por completar "{course.title}"</p>
                      </div>
                    )
                  })()}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default CourseDetailPage
