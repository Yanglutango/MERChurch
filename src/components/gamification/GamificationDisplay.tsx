import { useState, useEffect, useMemo } from 'react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Trophy, Star, Zap, Award, Target, Flame } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { UserLearningStats, Badge } from '../../types'

interface BadgeWithEarned {
  id: string
  name: string
  description: string
  icon_url: string
  color: string
  earned: boolean
  earned_at?: string
}

interface UserRank {
  rank: string
  level: number
  nextMilestone: number
  progress: number
}

interface GamificationProps {
  userId: string
}

// ✅ CORREÇÃO #31: Componente de Badges
export const BadgesDisplay = ({ userId }: GamificationProps) => {
  const [badges, setBadges] = useState<BadgeWithEarned[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBadges()
  }, [userId])

  const loadBadges = async () => {
    try {
      // Carregar todos os badges
      const { data: allBadges } = await supabase.from('badges').select('*')

      // Carregar badges do usuário
      const { data: userBadges } = await supabase.from('user_badges')
        .select('badge_id, earned_at')
        .eq('user_id', userId)

      const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || [])

      const badgesWithStatus = (allBadges || []).map(badge => ({
        ...badge,
        earned: earnedBadgeIds.has(badge.id),
      }))

      setBadges(badgesWithStatus)
    } catch (error) {
      console.error('Error loading badges:', error)
    } finally {
      setLoading(false)
    }
  }

  const earnedBadgesCount = useMemo(() => badges.filter(b => b.earned).length, [badges])
  const totalBadgesCount = useMemo(() => badges.length, [badges])

  return (
    <Card className="p-6 border">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Badges ({earnedBadgesCount}/{totalBadgesCount})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : badges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum badge disponível ainda</div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  badge.earned
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-muted bg-muted/30 opacity-50'
                }`}
              >
                <img 
                  src={badge.icon_url} 
                  alt={badge.name} 
                  className="h-12 w-12 rounded-full"
                />
                {badge.earned && (
                  <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                    <Star className="h-3 w-3 text-white fill-white" />
                  </div>
                )}
                <p className="text-xs font-semibold text-center text-foreground line-clamp-2">
                  {badge.name}
                </p>
                <p className="text-[10px] text-muted-foreground text-center line-clamp-2">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ✅ CORREÇÃO #32: Componente de Ranking
export const UserRankingDisplay = ({ userId }: GamificationProps) => {
  const [stats, setStats] = useState<UserLearningStats | null>(null)
  const [userRank, setUserRank] = useState<UserRank | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserStats()
  }, [userId])

  const loadUserStats = async () => {
    try {
      const { data } = await supabase.from('user_learning_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        setStats(data)
        calculateRank(data)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateRank = (stats: UserLearningStats) => {
    const points = stats.total_points_earned || 0
    let rank = 'Iniciante'
    let level = 1

    if (points >= 500) {
      rank = 'Mestre'
      level = 4
    } else if (points >= 300) {
      rank = 'Estudioso'
      level = 3
    } else if (points >= 100) {
      rank = 'Aprendiz'
      level = 2
    }

    const milestones = [100, 300, 500]
    const currentMilestoneIndex = milestones.findIndex(m => m > points)
    const nextMilestone = currentMilestoneIndex >= 0 ? milestones[currentMilestoneIndex] : 500
    const previousMilestone = currentMilestoneIndex > 0 ? milestones[currentMilestoneIndex - 1] : 0
    const progress = Math.round(((points - previousMilestone) / (nextMilestone - previousMilestone)) * 100)

    setUserRank({
      rank,
      level,
      nextMilestone,
      progress,
    })
  }

  const getRankIcon = (level: number) => {
    const icons = [
      { icon: Target, color: 'text-blue-500' },
      { icon: Flame, color: 'text-orange-500' },
      { icon: Trophy, color: 'text-yellow-500' },
      { icon: Star, color: 'text-purple-500' },
    ]
    return icons[level - 1] || icons[0]
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>
  }

  if (!stats || !userRank) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum dado disponível</div>
  }

  const RankIcon = getRankIcon(userRank.level).icon
  const rankColor = getRankIcon(userRank.level).color

  return (
    <Card className="p-6 border space-y-6">
      {/* Rank Display */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Seu Nível</p>
          <h3 className="text-3xl font-black text-foreground">{userRank.rank}</h3>
          <p className="text-xs text-muted-foreground">Nível {userRank.level}/4</p>
        </div>
        <div className={`p-4 rounded-full bg-gradient-to-br from-muted to-muted-foreground/20`}>
          <RankIcon className={`h-12 w-12 ${rankColor}`} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="text-2xl font-black text-blue-600">{stats.courses_completed || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Cursos Completos</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="text-2xl font-black text-green-600">{stats.lessons_completed || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">Lições Completas</p>
        </div>
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <div className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="text-2xl font-black text-yellow-600">{stats.total_points_earned || 0}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pontos</p>
        </div>
        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center gap-1">
            <Flame className="h-4 w-4 text-orange-600" />
            <span className="text-2xl font-black text-orange-600">{stats.current_streak || 0}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sequência</p>
        </div>
      </div>

      {/* Progress to next rank */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Progresso para próximo nível</p>
          <p className="text-xs font-bold text-muted-foreground">{userRank.progress}%</p>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${userRank.progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {stats.total_points_earned} / {userRank.nextMilestone} pontos
        </p>
      </div>

      {/* Recommendations */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border">
        <p className="text-xs font-semibold text-foreground mb-2">💡 Próximos Passos</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {stats.courses_completed < 5 && (
            <li>• Cumplete 5 cursos para desbloquear o badge "Aprendiz Dedicado"</li>
          )}
          {stats.current_streak < 7 && (
            <li>• Mantenha uma sequência de 7 dias para ganhar 50 pontos extras</li>
          )}
          {stats.lessons_completed < 50 && (
            <li>• Complete 50 lições para desbloquear um novo badge</li>
          )}
        </ul>
      </div>
    </Card>
  )
}

// ✅ CORREÇÃO #33: Componente de Leaderboard
interface LeaderboardUser {
  user_id: string
  username: string
  avatar: string
  total_points_earned: number
  courses_completed: number
  rank: string
}

interface LeaderboardProps {
  limit?: number
}

export const Leaderboard = ({ limit = 10 }: LeaderboardProps) => {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      const { data } = await supabase
        .from('user_learning_stats')
        .select(`
          user_id,
          total_points_earned,
          courses_completed,
          rank,
          user_profiles(username, avatar_url)
        `)
        .order('total_points_earned', { ascending: false })
        .limit(limit)

      if (data) {
        const formatted = data.map((item: any) => ({
          user_id: item.user_id,
          username: item.user_profiles?.username || 'Anônimo',
          avatar: item.user_profiles?.avatar_url || '',
          total_points_earned: item.total_points_earned || 0,
          courses_completed: item.courses_completed || 0,
          rank: item.rank || 'Iniciante',
        }))

        setUsers(formatted)
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 border">
      <div className="space-y-4">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Estudantes
        </h3>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Nenhum usuário ainda</div>
        ) : (
          <div className="space-y-2">
            {users.map((user, index) => {
              let medalColor = 'bg-gray-400'
              let medalEmoji = '🥉'
              
              if (index === 0) {
                medalColor = 'bg-yellow-500'
                medalEmoji = '🥇'
              } else if (index === 1) {
                medalColor = 'bg-gray-300'
                medalEmoji = '🥈'
              } else if (index === 2) {
                medalColor = 'bg-orange-600'
                medalEmoji = '🥉'
              }

              return (
                <div
                  key={user.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className={`${medalColor} rounded-full w-10 h-10 flex items-center justify-center font-black text-white text-sm`}>
                    {index + 1}
                  </div>
                  {user.avatar && (
                    <img src={user.avatar} alt={user.username} className="h-8 w-8 rounded-full" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.rank}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span className="font-bold text-sm text-foreground">{user.total_points_earned}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{user.courses_completed} cursos</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
