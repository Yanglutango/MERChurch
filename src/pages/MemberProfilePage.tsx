import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  User, Heart, MessageCircle, BookOpen, Calendar,
  Users, GraduationCap, ArrowLeft, ScrollText,
  Shield, Star, Clock,
} from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'

interface MemberProfile {
  id: string
  username: string
  email: string
  avatar_url?: string
  role: string
  congregation?: string
  created_at: string
}

interface ProfileStats {
  prayersCount: number
  postsCount: number
  testimoniesCount: number
  groupsCount: number
  enrollmentsCount: number
}

const MemberProfilePage = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [recentPrayers, setRecentPrayers] = useState<any[]>([])
  const [recentPosts, setRecentPosts] = useState<any[]>([])
  const [recentTestimonies, setRecentTestimonies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'prayers' | 'posts' | 'testimonies'>('overview')

  const isOwnProfile = currentUser?.id === userId
  const isAdmin = currentUser?.role === 'admin'
  const canView = isOwnProfile || isAdmin || currentUser?.role === 'member'

  useEffect(() => {
    if (userId && canView) loadProfile()
  }, [userId])

  const loadProfile = async () => {
    setLoading(true)
    const [
      profileRes,
      prayersCountRes,
      postsCountRes,
      testimoniesCountRes,
      groupsCountRes,
      enrollmentsCountRes,
      recentPrayersRes,
      recentPostsRes,
      recentTestimoniesRes,
    ] = await Promise.all([
      supabase.from('user_profiles').select('id, username, email, avatar_url, role, congregation, created_at').eq('id', userId!).single(),
      supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId!),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId!),
      supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('user_id', userId!).eq('is_approved', true),
      supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_id', userId!),
      supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId!),
      supabase.from('prayer_requests').select('id, title, prayer_count, created_at, is_answered').eq('user_id', userId!).order('created_at', { ascending: false }).limit(5),
      supabase.from('community_posts').select('id, content, likes_count, created_at').eq('user_id', userId!).order('created_at', { ascending: false }).limit(3),
      supabase.from('testimonies').select('id, title, category, content, created_at').eq('user_id', userId!).eq('is_approved', true).order('created_at', { ascending: false }).limit(3),
    ])

    if (profileRes.data) setProfile(profileRes.data)
    setStats({
      prayersCount: prayersCountRes.count || 0,
      postsCount: postsCountRes.count || 0,
      testimoniesCount: testimoniesCountRes.count || 0,
      groupsCount: groupsCountRes.count || 0,
      enrollmentsCount: enrollmentsCountRes.count || 0,
    })
    setRecentPrayers(recentPrayersRes.data || [])
    setRecentPosts(recentPostsRes.data || [])
    setRecentTestimonies(recentTestimoniesRes.data || [])
    setLoading(false)
  }

  if (!canView) {
    return (
      <Layout title="Perfil">
        <EmptyState
          icon={Shield}
          title="Acesso restrito"
          description="Apenas membros podem ver perfis públicos."
          action={<Button onClick={() => navigate('/auth')}>Fazer login</Button>}
        />
      </Layout>
    )
  }

  if (loading) return <Layout title="Perfil do Membro"><LoadingState fullScreen message="Carregando perfil..." /></Layout>

  if (!profile) {
    return (
      <Layout title="Perfil">
        <EmptyState
          icon={User}
          title="Perfil não encontrado"
          description="Este utilizador não existe ou não está disponível."
          action={<Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>}
        />
      </Layout>
    )
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const roleLabel = profile.role === 'admin' ? 'Administrador' : profile.role === 'member' ? 'Membro' : 'Convidado'
  const roleColor = profile.role === 'admin' ? 'from-amber-500 to-orange-500' : 'from-[#0A2E4A] to-[#4A90A4]'

  const TABS = [
    { id: 'overview' as const, label: 'Visão Geral', icon: User },
    { id: 'prayers' as const, label: `Orações (${stats?.prayersCount || 0})`, icon: Heart },
    { id: 'posts' as const, label: `Posts (${stats?.postsCount || 0})`, icon: MessageCircle },
    { id: 'testimonies' as const, label: `Testemunhos (${stats?.testimoniesCount || 0})`, icon: ScrollText },
  ]

  return (
    <Layout title="Perfil do Membro">
      <div className="space-y-5">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Profile Card */}
        <Card className="relative overflow-hidden border-0 shadow-xl rounded-2xl">
          {/* Banner */}
          <div className={`h-28 md:h-36 bg-gradient-to-br ${roleColor}`} />

          <div className="px-5 pb-6 md:px-8 md:pb-8">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-5">
              <div className="relative flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="h-24 w-24 rounded-2xl border-4 border-background object-cover shadow-lg"
                  />
                ) : (
                  <div className={`h-24 w-24 rounded-2xl border-4 border-background bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                    {profile.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                {profile.role === 'admin' && (
                  <div className="absolute -bottom-2 -right-2 p-1.5 bg-amber-500 rounded-lg shadow-md">
                    <Shield className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="self-start sm:self-end border-2 font-semibold"
                >
                  Editar Perfil
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{profile.username}</h1>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full text-white bg-gradient-to-r ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Membro desde {memberSince}
                </span>
                {profile.congregation && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {profile.congregation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { icon: Heart,         label: 'Orações',      value: stats?.prayersCount || 0,     color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30' },
            { icon: MessageCircle, label: 'Publicações',  value: stats?.postsCount || 0,       color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { icon: ScrollText,    label: 'Testemunhos',  value: stats?.testimoniesCount || 0, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' },
            { icon: Users,         label: 'Grupos',       value: stats?.groupsCount || 0,      color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
            { icon: GraduationCap, label: 'Cursos',       value: stats?.enrollmentsCount || 0, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' },
          ].map(stat => (
            <Card key={stat.label} className="p-4 border text-center">
              <div className={`inline-flex p-2 rounded-lg mb-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto p-1 bg-muted/40 rounded-xl border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#0A2E4A] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent prayers */}
            <Card className="p-5 border">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                <Heart className="h-4 w-4 text-rose-500" />
                Pedidos de Oração Recentes
              </h3>
              {recentPrayers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido ainda</p>
              ) : (
                <div className="space-y-2">
                  {recentPrayers.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40">
                      {p.is_answered && <Star className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.prayer_count} orações</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent posts */}
            <Card className="p-5 border">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                Publicações Recentes
              </h3>
              {recentPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma publicação ainda</p>
              ) : (
                <div className="space-y-2">
                  {recentPosts.map(p => (
                    <div key={p.id} className="p-2.5 rounded-lg bg-muted/40">
                      <p className="text-sm text-foreground line-clamp-2">{p.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3" />{p.likes_count || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'prayers' && (
          <Card className="border overflow-hidden">
            {recentPrayers.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={Heart} title="Sem pedidos de oração" description="Este membro ainda não compartilhou pedidos" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPrayers.map(p => (
                  <div key={p.id} className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${p.is_answered ? 'bg-green-100 dark:bg-green-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                      <Heart className={`h-4 w-4 ${p.is_answered ? 'text-green-600' : 'text-rose-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-foreground text-sm">{p.title}</p>
                        {p.is_answered && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">Respondida</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{p.prayer_count} pessoas oraram · {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'posts' && (
          <Card className="border overflow-hidden">
            {recentPosts.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={MessageCircle} title="Sem publicações" description="Este membro ainda não publicou nada na comunidade" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPosts.map(p => (
                  <div key={p.id} className="p-4">
                    <p className="text-sm text-foreground/90 leading-relaxed mb-2">{p.content}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes_count || 0}</span>
                      <span>{new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'testimonies' && (
          <Card className="border overflow-hidden">
            {recentTestimonies.length === 0 ? (
              <div className="p-8">
                <EmptyState icon={ScrollText} title="Sem testemunhos" description="Este membro ainda não compartilhou testemunhos aprovados" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentTestimonies.map(t => (
                  <div key={t.id} className="p-4">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{t.title}</p>
                      {t.category && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full capitalize">{t.category}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{t.content}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  )
}

export default MemberProfilePage
