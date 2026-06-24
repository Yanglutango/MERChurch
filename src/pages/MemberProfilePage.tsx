import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  User, Heart, MessageCircle, BookOpen, Calendar,
  Users, GraduationCap, ArrowLeft, ScrollText,
  Shield, Star, Clock, CheckCircle2, ArrowUpRight
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

  const loadProfile = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
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
        supabase.from('user_profiles').select('id, username, email, avatar_url, role, congregation, created_at').eq('id', userId).single(),
        supabase.from('prayer_requests').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('testimonies').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_approved', true),
        supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('prayer_requests').select('id, title, prayer_count, created_at, is_answered').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('community_posts').select('id, content, likes_count, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
        supabase.from('testimonies').select('id, title, category, content, created_at').eq('user_id', userId).eq('is_approved', true).order('created_at', { ascending: false }).limit(3),
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
    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId && canView) {
      loadProfile()
    }
  }, [userId, canView, loadProfile])

  if (!canView) {
    return (
      <Layout title="Perfil">
        <EmptyState
          icon={Shield}
          title="Acesso restrito"
          description="Apenas membros autenticados podem ver perfis da comunidade."
          action={<Button onClick={() => navigate('/auth')} className="bg-[#0A2E4A] hover:bg-[#0A2E4A]/90 text-white font-bold px-6 h-11 rounded-xl">Fazer login</Button>}
        />
      </Layout>
    )
  }

  if (loading) return <Layout title="Perfil do Membro"><LoadingState fullScreen message="Sincronizando dados do perfil corporativo..." /></Layout>

  if (!profile) {
    return (
      <Layout title="Perfil">
        <EmptyState
          icon={User}
          title="Perfil não localizado"
          description="Este utilizador não existe ou foi removido do sistema corporativo."
          action={<Button variant="outline" onClick={() => navigate(-1)} className="border-2 font-bold rounded-xl"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à página anterior</Button>}
        />
      </Layout>
    )
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const roleLabel = profile.role === 'admin' ? 'Administrador' : profile.role === 'member' ? 'Membro' : 'Convidado'
  const roleColor = profile.role === 'admin' ? 'from-amber-500 to-orange-600 shadow-amber-500/10' : 'from-[#0A2E4A] to-[#4A90A4] shadow-blue-900/10'

  const TABS = [
    { id: 'overview' as const, label: 'Visão Geral', icon: User },
    { id: 'prayers' as const, label: `Orações (${stats?.prayersCount || 0})`, icon: Heart },
    { id: 'posts' as const, label: `Posts (${stats?.postsCount || 0})`, icon: MessageCircle },
    { id: 'testimonies' as const, label: `Testemunhos (${stats?.testimoniesCount || 0})`, icon: ScrollText },
  ]

  return (
    <Layout title="Perfil do Membro">
      <div className="space-y-6 max-w-7xl mx-auto p-1 animate-in fade-in duration-300">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Voltar para a listagem
        </button>

        {/* Profile Card */}
        <Card className="relative overflow-hidden border-2 shadow-xl rounded-2xl bg-card">
          {/* Banner */}
          <div className={`h-32 md:h-44 bg-gradient-to-br ${roleColor} relative`}>
            <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
          </div>

          <div className="px-5 pb-6 md:px-8 md:pb-8">
            {/* Avatar & Actions Container */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 md:-mt-16 mb-5">
              <div className="relative flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="h-28 w-28 md:h-32 md:w-32 rounded-2xl border-4 border-background object-cover shadow-xl"
                  />
                ) : (
                  <div className={`h-28 w-28 md:h-32 md:w-32 rounded-2xl border-4 border-background bg-gradient-to-br ${roleColor} flex items-center justify-center text-white text-4xl font-black shadow-xl`}>
                    {profile.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                {profile.role === 'admin' && (
                  <div className="absolute -bottom-2 -right-2 p-2 bg-amber-500 rounded-xl shadow-lg border-2 border-background animate-pulse">
                    <Shield className="h-4 w-4 text-white stroke-[2.5]" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="self-start sm:self-end border-2 font-bold h-10 px-4 rounded-xl hover:bg-muted shadow-sm transition-all active:scale-[0.98]"
                >
                  Configurar Perfil
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{profile.username}</h1>
                <span className={`px-3 py-0.5 text-xs font-extrabold rounded-full text-white bg-gradient-to-r shadow-sm ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border">
                  <Clock className="h-4 w-4 text-primary" />
                  Membro desde {memberSince}
                </span>
                {profile.congregation && (
                  <span className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-lg border">
                    <Users className="h-4 w-4 text-primary" />
                    {profile.congregation}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {[
            { icon: Heart,          label: 'Orações',      value: stats?.prayersCount || 0,     color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-950/40' },
            { icon: MessageCircle, label: 'Publicações',  value: stats?.postsCount || 0,       color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-950/40' },
            { icon: ScrollText,    label: 'Testemunhos',  value: stats?.testimoniesCount || 0, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-950/40' },
            { icon: Users,          label: 'Grupos',       value: stats?.groupsCount || 0,      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-950/40' },
            { icon: GraduationCap, label: 'Cursos',       value: stats?.enrollmentsCount || 0, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-950/40' },
          ].map(stat => (
            <Card key={stat.label} className={`p-4 border-2 rounded-2xl text-center bg-card shadow-sm hover:shadow-md transition-all ${stat.color.split(' ').slice(-1)[0]}`}>
              <div className={`inline-flex p-2.5 rounded-xl mb-2 border ${stat.color.split(' ').slice(0, 3).join(' ')}`}>
                <stat.icon className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div className="text-2xl md:text-3xl font-black text-foreground tracking-tight">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-bold mt-0.5 tracking-wide uppercase">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Custom Navigation Tabs */}
        <div className="flex gap-1 overflow-x-auto p-1.5 bg-muted/50 rounded-2xl border-2 scrollbar-none snap-x">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all snap-items ${
                activeTab === tab.id
                  ? 'bg-[#0A2E4A] text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
              }`}
            >
              <tab.icon className="h-4 w-4 stroke-[2.2]" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-5">
              {/* Recent Prayers Sub-Card */}
              <Card className="p-5 md:p-6 border-2 rounded-2xl bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-foreground mb-4 flex items-center justify-between text-sm border-b pb-2 tracking-tight">
                    <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-rose-500 stroke-[2.5]" /> Pedidos de Oração Recentes</span>
                    <Button variant="link" size="sm" onClick={() => setActiveTab('prayers')} className="h-auto p-0 font-bold text-primary">Ver todos</Button>
                  </h3>
                  {recentPrayers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center font-medium py-6">Nenhum pedido compartilhado até o momento.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentPrayers.slice(0, 3).map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => navigate(`/prayers/${p.id}`)}
                          className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border-2 border-transparent hover:border-primary/20 hover:bg-background transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Heart className={`h-4 w-4 mt-0.5 flex-shrink-0 ${p.is_answered ? 'text-emerald-500 fill-emerald-500' : 'text-rose-500'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{p.title}</p>
                              <p className="text-xs text-muted-foreground font-semibold">{p.prayer_count} intercessores em oração</p>
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Posts Sub-Card */}
              <Card className="p-5 md:p-6 border-2 rounded-2xl bg-card shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-foreground mb-4 flex items-center justify-between text-sm border-b pb-2 tracking-tight">
                    <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-blue-500 stroke-[2.5]" /> Publicações Recentes</span>
                    <Button variant="link" size="sm" onClick={() => setActiveTab('posts')} className="h-auto p-0 font-bold text-primary">Ver todos</Button>
                  </h3>
                  {recentPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center font-medium py-6">Nenhuma publicação registrada na timeline.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentPosts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => navigate(`/posts/${p.id}`)}
                          className="group p-3 rounded-xl bg-muted/40 border-2 border-transparent hover:border-primary/20 hover:bg-background transition-all cursor-pointer flex justify-between items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-relaxed">{p.content}</p>
                            <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-muted-foreground">
                              <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-500 fill-rose-500" />{p.likes_count || 0} curtidas</span>
                              <span>•</span>
                              <span>{new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'prayers' && (
            <Card className="border-2 rounded-2xl overflow-hidden bg-card shadow-sm">
              {recentPrayers.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={Heart} title="Sem intercessões ativas" description="Este membro ainda não realizou publicações de intercessão ou clamor na plataforma." />
                </div>
              ) : (
                <div className="divide-y-2 divide-muted">
                  {recentPrayers.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => navigate(`/prayers/${p.id}`)}
                      className="group p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl flex-shrink-0 border ${p.is_answered ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 border-rose-100 dark:border-rose-900/30'}`}>
                          <Heart className={`h-5 w-5 stroke-[2.2] ${p.is_answered ? 'fill-emerald-500' : ''}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-bold text-foreground text-sm md:text-base group-hover:text-primary transition-colors truncate">{p.title}</p>
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                              p.is_answered 
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' 
                                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            }`}>
                              {p.is_answered ? 'Respondida' : 'Ativo'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            {p.prayer_count} pessoas se uniram em clamor · Postado em {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'posts' && (
            <Card className="border-2 rounded-2xl overflow-hidden bg-card shadow-sm">
              {recentPosts.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={MessageCircle} title="Feed de publicações vazio" description="Este utilizador ainda não realizou posts interativos ou reflexões com a comunidade." />
                </div>
              ) : (
                <div className="divide-y-2 divide-muted">
                  {recentPosts.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => navigate(`/posts/${p.id}`)}
                      className="group p-5 hover:bg-muted/30 transition-colors cursor-pointer flex justify-between items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base text-foreground/90 font-medium leading-relaxed mb-3 group-hover:text-primary transition-colors">{p.content}</p>
                        <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                          <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg border">
                            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                            {p.likes_count || 0} Reações
                          </span>
                          <span className="flex items-center gap-1 bg-muted px-2.5 py-1 rounded-lg border">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === 'testimonies' && (
            <Card className="border-2 rounded-2xl overflow-hidden bg-card shadow-sm">
              {recentTestimonies.length === 0 ? (
                <div className="p-8">
                  <EmptyState icon={ScrollText} title="Nenhum testemunho público" description="Não constam testemunhos aprovados e revisados pela moderação associados a este perfil." />
                </div>
              ) : (
                <div className="divide-y-2 divide-muted">
                  {recentTestimonies.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => navigate(`/testimonies/${t.id}`)}
                      className="group p-5 hover:bg-muted/30 transition-colors cursor-pointer flex justify-between items-center gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                          <p className="font-extrabold text-foreground text-sm md:text-base group-hover:text-primary transition-colors truncate">{t.title}</p>
                          {t.category && (
                            <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-full uppercase tracking-wider">{t.category}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium line-clamp-2 leading-relaxed mb-2">{t.content}</p>
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
                          Testemunho Validado · Compartilhado em {new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default MemberProfilePage
